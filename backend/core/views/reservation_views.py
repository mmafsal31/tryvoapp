from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal
import json
from rest_framework.permissions import IsAuthenticated

from core.models import Reservation, Product, ProductSize, Store, Sale, CustomerCredit
from core.serializers import ReservationPOSSerializer, ReservationSerializer

# -----------------------------
# ✅ Reservation ViewSet
# -----------------------------
class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related(
        "product", "product__store", "size", "customer"
    ).prefetch_related("product__sizes").order_by("-created_at")
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_store", False) and hasattr(user, "store"):
            return self.queryset.filter(product__store=user.store)
        return self.queryset.filter(customer=user)

    def perform_create(self, serializer):
        user = self.request.user
        # Attach customer
        reservation = serializer.save(customer=user)
        # Auto attach store from product or user
        if reservation.product and hasattr(reservation.product, "store"):
            reservation.store = reservation.product.store
        elif hasattr(user, "store"):
            reservation.store = user.store
        reservation.save()


# -----------------------------
# ✅ Verify Reservation Code
# -----------------------------
class VerifyReservationCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reservation = Reservation.objects.select_related("product", "size").get(pk=pk)
        except Reservation.DoesNotExist:
            return Response({"success": False, "message": "Reservation not found."}, status=404)

        code = str(request.data.get("code", "")).strip()
        if code != str(reservation.unique_code).strip():
            return Response({"success": False, "message": "Invalid reservation code."}, status=400)

        if reservation.is_expired():
            reservation.status = "expired"
            reservation.save()
            return Response({"success": False, "message": "Reservation expired."}, status=400)

        size = reservation.size
        if size.quantity < reservation.quantity:
            return Response({"success": False, "message": f"Not enough stock for {size.product.name} ({size.size_label})."}, status=400)

        

        reservation.status = "completed"
        reservation.save()

        # Auto log sale
        Sale.objects.create(
            store=reservation.product.store,
            products=[{
                "product": reservation.product.name,
                "size": reservation.size.size_label,
                "price": str(reservation.size.price),
                "quantity": reservation.quantity,
                "advance_amount": str(reservation.advance_amount),
            }],
            total_amount=Decimal(reservation.advance_amount),
        )

        return Response({
            "success": True,
            "message": "Reservation verified and stock updated successfully.",
            "discount": float(reservation.advance_amount),
            "advance_amount": float(reservation.advance_amount)
        }, status=200)


# -----------------------------
# ✅ Create Reservation Sale
# -----------------------------
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_reservation_sale(request):
    user = request.user
    data = request.data

    try:
        # 1️⃣ Validate store ownership
        store = get_object_or_404(Store, owner=user)

        # 2️⃣ Validate reservation
        reservation_id = data.get("reservation_id")
        if not reservation_id:
            return Response({"success": False, "message": "Reservation ID is required."}, status=400)

        reservation = get_object_or_404(Reservation, id=reservation_id, store=store)

        # 3️⃣ Validate cart
        cart_items = data.get("cart", [])
        if not cart_items:
            return Response({"success": False, "message": "Cart is empty."}, status=400)

        # 4️⃣ Validate totals
        try:
            subtotal = Decimal(str(data.get("subtotal", 0)))
            discount = Decimal(str(data.get("discount", 0)))
            total = Decimal(str(data.get("total", 0)))
        except Exception:
            return Response({"success": False, "message": "Invalid subtotal, discount, or total."}, status=400)

        customer_data = data.get("customer", {})
        payment_data = data.get("payment", {})
        credit_amount = Decimal(str(payment_data.get("credit_amount", 0) or 0))

        # 5️⃣ Transaction block
        with transaction.atomic():
            # Create sale
            sale = Sale.objects.create(
                store=store,
                products=cart_items,
                subtotal=subtotal,
                discount=discount,
                total_amount=total,
                customer_name=customer_data.get("name", ""),
                customer_phone=customer_data.get("phone", ""),
                payment=json.dumps(payment_data, default=float),
                credit_amount=credit_amount,
                reservation=reservation,
                is_credit=(credit_amount > 0),
            )

            # 6️⃣ Deduct stock for each cart item
            for item in cart_items:
                product_id = item.get("product_id")
                size_label = item.get("size_label")
                quantity = int(item.get("quantity", 1))

                if not product_id or not size_label:
                    raise ValueError("Each cart item must have product_id and size_label.")

                product = get_object_or_404(Product, id=product_id, store=store)
                
                # Ensure size belongs to product
                try:
                    size_obj = ProductSize.objects.get(product=product, size_label=size_label)
                except ProductSize.DoesNotExist:
                    raise ValueError(f"Size '{size_label}' not found for product '{product.name}'.")

                if size_obj.quantity < quantity:
                    raise ValueError(f"Not enough stock for {product.name} ({size_label}).")

                size_obj.quantity -= quantity
                size_obj.save()

            # 7️⃣ Complete reservation
            reservation.status = "completed"
            reservation.save()

            # 8️⃣ Handle customer credit
            if credit_amount > 0:
                CustomerCredit.objects.create(
                    store=store,
                    customer_name=customer_data.get("name", ""),
                    customer_phone=customer_data.get("phone", ""),
                    amount=credit_amount,
                    reference_sale=sale,
                )

        # ✅ Success response
        return Response({
            "success": True,
            "message": "Reservation sale completed successfully",
            "invoice": sale.invoice_no,
            "total": float(sale.total_amount)
        }, status=200)

    except Exception as e:
        # Catch all errors
        return Response({"success": False, "message": str(e)}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_store_reservations(request):
    try:
        store = Store.objects.get(owner=request.user)
    except Store.DoesNotExist:
        return Response({"error": "Store not found"}, status=404)

    reservations = Reservation.objects.filter(product__store=store)\
        .select_related("product", "size", "customer")\
        .prefetch_related("product__sizes", "product__images")\
        .order_by("-created_at")

    serializer = ReservationPOSSerializer(reservations, many=True, context={"request": request})
    return Response(serializer.data)
