from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
from core.models import Product
from core.serializers import ProductSerializer

# -------------------------------------------------------
# 🔐 Custom permission for store owners
# -------------------------------------------------------
class IsStoreOwnerOrReadOnly(permissions.BasePermission):
    """
    Allow anyone to read, but only store owners can modify.
    """
    def has_permission(self, request, view):
        # Read-only permissions for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions only for authenticated store owners
        return request.user and request.user.is_authenticated and getattr(request.user, "is_store", False)

    def has_object_permission(self, request, view, obj):
        # Read-only for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write access only if user owns this product
        return obj.store.owner == request.user


# -------------------------------------------------------
# 🛍 Product ViewSet
# -------------------------------------------------------
# core/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
from core.models import Product, ProductSize
from core.serializers import ProductSerializer, ProductSizeSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public read access.
    Store owners can create, update, and delete their own products.
    """
    serializer_class = ProductSerializer
    lookup_field = "pk"

    def get_permissions(self):
        """
        Public GET access, restricted write access.
        """
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Product.objects.select_related("store").prefetch_related("sizes").order_by("-id")

        # 🧠 Public or normal users → see all
        if not user.is_authenticated or not getattr(user, "is_store", False):
            return qs

        # 🏪 Store owner → see their products
        if getattr(user, "is_store", False) and hasattr(user, "store"):
            if self.action == "my_products":
                return qs.filter(store__owner=user)
            return qs
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, "is_store", False) or not hasattr(user, "store"):
            raise PermissionDenied("Only store owners can create products.")
        serializer.save(store=user.store)

    def perform_update(self, serializer):
        product = self.get_object()
        user = self.request.user
        if product.store.owner != user:
            raise PermissionDenied("You can only update your own products.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.store.owner != user:
            raise PermissionDenied("You can only delete your own products.")
        instance.delete()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my_products(self, request):
        """
        Return logged-in store owner's products.
        """
        user = request.user
        if not getattr(user, "is_store", False) or not hasattr(user, "store"):
            return Response(
                {"detail": "Access denied. Only store owners can view their products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        products = (
            Product.objects.filter(store__owner=user)
            .select_related("store")
            .prefetch_related("sizes")
            .order_by("-id")
        )

        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

# -------------------------------------------------------------------
# PRODUCT SIZE
# -------------------------------------------------------------------

class ProductSizeViewSet(viewsets.ModelViewSet):
    queryset = ProductSize.objects.all()
    serializer_class = ProductSizeSerializer
    permission_classes = [permissions.IsAuthenticated]

# ---------------------- PUBLIC PRODUCT LIST ----------------------
class PublicProductListView(generics.ListAPIView):
    """Public endpoint to view all active products."""
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Product.objects.all().select_related("store").order_by("-id")
    
