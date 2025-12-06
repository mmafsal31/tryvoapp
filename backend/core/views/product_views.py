from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied

from core.models import (
    Product,
    ProductSize,
    StoreCategory,
    StoreSubCategory,
    OfferCategory,
)

from core.serializers import (
    ProductSerializer,
    ProductSizeSerializer,
    StoreCategorySerializer,
    StoreSubCategorySerializer,
    OfferCategorySerializer,
)


# ==========================================================
# PERMISSION: ONLY STORE OWNERS CAN MODIFY
# ==========================================================
class IsStoreOwnerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and getattr(request.user, "is_store", False)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.store.owner == request.user


# ==========================================================
# PRODUCT VIEWSET
# ==========================================================
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = "pk"
    permission_classes = [IsStoreOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Product.objects.select_related("store").order_by("-id")

        if not user.is_authenticated or not getattr(user, "is_store", False):
            return qs

        if hasattr(user, "store") and self.action == "my_products":
            return qs.filter(store=user.store)

        return qs

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, "store"):
            return Response({"detail": "You do not have a store."}, status=403)

        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(store=request.user.store)

        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        product = self.get_object()

        if product.store.owner != request.user:
            raise PermissionDenied("You can update only your products.")

        data = request.data.copy()
        data["store"] = request.user.store.id

        serializer = self.get_serializer(product, data=data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def perform_destroy(self, instance):
        if instance.store.owner != self.request.user:
            raise PermissionDenied("You can delete only your products.")
        instance.delete()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my_products(self, request):
        if not hasattr(request.user, "store"):
            return Response({"detail": "You do not have a store."}, status=403)

        qs = Product.objects.filter(store=request.user.store).order_by("-id")
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# ==========================================================
# PRODUCT SIZE VIEWSET
# ==========================================================
class ProductSizeViewSet(viewsets.ModelViewSet):
    queryset = ProductSize.objects.all()
    serializer_class = ProductSizeSerializer
    permission_classes = [permissions.IsAuthenticated]


# ==========================================================
# PUBLIC PRODUCT LIST
# ==========================================================
class PublicProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Product.objects.all().order_by("-id")


# ==========================================================
# CATEGORY APIs
# ==========================================================
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_categories(request):
    categories = StoreCategory.objects.filter(store=request.user.store)
    serializer = StoreCategorySerializer(categories, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def add_category(request):
    data = request.data.copy()
    data["store"] = request.user.store.id

    serializer = StoreCategorySerializer(data=data, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT"])
@permission_classes([permissions.IsAuthenticated])
def update_category(request, pk):
    try:
        category = StoreCategory.objects.get(id=pk, store=request.user.store)
    except StoreCategory.DoesNotExist:
        return Response({"error": "Category not found"}, status=404)

    data = request.data.copy()
    data["store"] = request.user.store.id

    serializer = StoreCategorySerializer(category, data=data, partial=True, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ==========================================================
# SUBCATEGORY APIs
# ==========================================================
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_subcategories(request, pk):
    try:
        category = StoreCategory.objects.get(id=pk, store=request.user.store)
    except StoreCategory.DoesNotExist:
        return Response({"error": "Category not found"}, status=404)

    subs = category.subcategories.all()
    serializer = StoreSubCategorySerializer(subs, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def add_subcategory(request):
    serializer = StoreSubCategorySerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT"])
@permission_classes([permissions.IsAuthenticated])
def update_subcategory(request, pk):
    try:
        sub = StoreSubCategory.objects.get(id=pk, category__store=request.user.store)
    except StoreSubCategory.DoesNotExist:
        return Response({"error": "Subcategory not found"}, status=404)

    serializer = StoreSubCategorySerializer(sub, data=request.data, partial=True, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ==========================================================
# OFFER CATEGORY APIs
# ==========================================================
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_offer_categories(request):
    offers = OfferCategory.objects.filter(store=request.user.store)
    serializer = OfferCategorySerializer(offers, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def add_offer_category(request):
    """
    The frontend sends FormData with:
    title, start_date, end_date, banner_image
    """
    if not hasattr(request.user, "store"):
        return Response({"error": "You do not own a store."}, status=403)

    data = request.data.copy()
    data["store"] = request.user.store.id

    serializer = OfferCategorySerializer(data=data, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["PUT"])
@permission_classes([permissions.IsAuthenticated])
def update_offer_category(request, pk):
    try:
        offer = OfferCategory.objects.get(id=pk, store=request.user.store)
    except OfferCategory.DoesNotExist:
        return Response({"error": "Offer category not found"}, status=404)

    serializer = OfferCategorySerializer(
        offer, data=request.data, partial=True, context={"request": request}
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_offer_category(request, pk):
    try:
        offer = OfferCategory.objects.get(id=pk, store=request.user.store)
    except OfferCategory.DoesNotExist:
        return Response({"error": "Offer category not found"}, status=404)

    offer.delete()
    return Response({"message": "Offer deleted"}, status=200)
