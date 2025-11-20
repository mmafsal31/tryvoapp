# attendance/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from datetime import date
from calendar import monthrange
from rest_framework import serializers

from core.models import Staff, Attendance, SalaryRecord
from core.serializers import StaffSerializer, AttendanceSerializer, SalaryRecordSerializer

class OwnerScopedMixin:
    """Mixin to restrict queryset to request.user (owner)"""
    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class StaffViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]

class AttendanceViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('staff').all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # ensure staff belongs to owner
        staff = serializer.validated_data['staff']
        if staff.owner != self.request.user:
            raise serializers.ValidationError("Staff does not belong to you.")
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        # same owner guard
        staff = serializer.validated_data.get('staff') or serializer.instance.staff
        if staff.owner != self.request.user:
            raise serializers.ValidationError("Staff does not belong to you.")
        serializer.save()

    @action(detail=False, methods=['get'], url_path='by-month')
    def by_month(self, request):
        """
        Query params: year, month, staff (optional)
        Returns attendance list and totals for the month
        """
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        staff_id = request.query_params.get('staff')

        qs = self.get_queryset().filter(date__year=year, date__month=month)
        if staff_id:
            qs = qs.filter(staff_id=staff_id)

        # annotate amounts per attendance
        items = AttendanceSerializer(qs.order_by('date'), many=True).data

        # compute total amount
        total = sum([attendance.get('amount') and float(attendance['amount']) or 0 for attendance in items])
        return Response({
            'year': year, 'month': month, 'total': f"{total:.2f}",
            'attendances': items
        })

    @action(detail=False, methods=['post'], url_path='checkout')
    @transaction.atomic
    def checkout(self, request):
        """
        Checkout salary for a staff for given year+month.
        Payload: { staff: <id>, year: 2025, month: 11, notes: '' }
        Creates a SalaryRecord (unique per staff+month).
        """
        staff_id = request.data.get('staff')
        year = int(request.data.get('year', timezone.now().year))
        month = int(request.data.get('month', timezone.now().month))
        notes = request.data.get('notes', '')

        # basic validation
        try:
            staff = Staff.objects.get(id=staff_id, owner=request.user)
        except Staff.DoesNotExist:
            return Response({"detail": "Staff not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

        # avoid duplicate
        if SalaryRecord.objects.filter(staff=staff, year=year, month=month).exists():
            return Response({"detail": "Salary record already exists for this staff and month."}, status=status.HTTP_400_BAD_REQUEST)

        # compute total: sum of compute_amount for attendances in month
        attendances = Attendance.objects.filter(staff=staff, date__year=year, date__month=month)
        total = sum([a.compute_amount() for a in attendances])
        # create record
        sr = SalaryRecord.objects.create(
            owner=request.user, staff=staff, year=year, month=month,
            total_amount=total, notes=notes
        )
        return Response(SalaryRecordSerializer(sr).data, status=status.HTTP_201_CREATED)

class SalaryRecordViewSet(OwnerScopedMixin, viewsets.ModelViewSet):
    queryset = SalaryRecord.objects.select_related('staff').all()
    serializer_class = SalaryRecordSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='monthly-summary')
    def monthly_summary(self, request):
        """
        Returns aggregated salary summary for owner by year+month and optional staff filter.
        Query params: year (opt), month (opt), staff (opt)
        """
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        staff_id = request.query_params.get('staff')

        qs = self.get_queryset()
        if year:
            qs = qs.filter(year=int(year))
        if month:
            qs = qs.filter(month=int(month))
        if staff_id:
            qs = qs.filter(staff_id=staff_id)

        # Group by year/month
        from django.db.models import Sum
        summary = qs.values('year', 'month').annotate(total=Sum('total_amount')).order_by('-year', '-month')
        return Response(list(summary))
