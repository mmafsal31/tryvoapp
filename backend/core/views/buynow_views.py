# core/views/buynow_views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from decimal import Decimal
from core.models import BuyNowOrder, ProductSize
from core.serializers import BuyNowOrderSerializer


class BuyNowOrderViewSet(viewsets.ModelViewSet):
    queryset = BuyNowOrder.objects.select_related("product", "store", "size", "customer").order_by("-created_at")
    serializer_class = BuyNowOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user

        if not user or not user.is_authenticated:
            return Response({"error": "Login required."}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data.copy()
        size_id = data.get("size")

        if not size_id:
            return Response({"error": "Size ID required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            size = ProductSize.objects.select_related("product", "product__store").get(id=size_id)
        except ProductSize.DoesNotExist:
            return Response({"error": "Invalid product size."}, status=status.HTTP_404_NOT_FOUND)

        quantity = int(data.get("quantity", 1))
        if size.quantity < quantity:
            return Response(
                {"error": f"Only {size.quantity} units available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_price = Decimal(size.price) * quantity

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # ✅ Inject real FK objects instead of relying on serializer
        order = serializer.save(
            customer=user,
            product=size.product,
            store=size.product.store,
            total_price=total_price,
        )

        # ✅ Deduct stock
        size.quantity -= quantity
        size.save()

        return Response(
            {
                "message": "Order placed successfully",
                "order_id": order.id,
                "total": str(total_price),
                "product_name": order.product.name,
                "size_label": order.size.size_label,
            },
            status=status.HTTP_201_CREATED,
        )

