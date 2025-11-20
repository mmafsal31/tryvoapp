from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAdminUser, AllowAny
from core.models import Advertisement
from core.serializers import AdvertisementSerializer

class AdvertisementViewSet(viewsets.ModelViewSet):
    queryset = Advertisement.objects.all()
    serializer_class = AdvertisementSerializer

    def get_permissions(self):
        """
        ✅ Public can view ads
        ✅ Only admin can create, update, delete
        """
        if self.action in ["list", "retrieve"]:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        ✅ Return only active ads for public users
        ✅ Admins can see all ads
        """
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(active=True)
        return qs