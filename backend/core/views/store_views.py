from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from core.models import Store
from core.serializers import StoreSerializer


class StoreViewSet(viewsets.ModelViewSet):
    """CRUD for store profiles."""
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


# core/views.py
class SwitchToStoreView(generics.GenericAPIView):
    """Convert a user into a store owner and create the store."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # Prevent duplicate store creation
        if hasattr(user, 'store'):
            return Response({"detail": "Store already exists."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data

        # Validate input
        store_name = data.get("store_name")
        place = data.get("place")
        category = data.get("category")
        phone = data.get("phone")

        if not store_name or not place or not category:
            return Response(
                {"detail": "store_name, place, and category are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create store linked to user
        store = Store.objects.create(
            owner=user,
            store_name=store_name,
            place=place,
            category=category,
            phone=phone,
        )

        user.is_store = True
        user.save(update_fields=["is_store"])

        return Response(StoreSerializer(store).data, status=status.HTTP_201_CREATED)


# ✅ FINALIZED store_detail VIEW
@api_view(["GET"])
def store_detail(request, pk):
    """
    Returns detailed store info with its products, sizes, and branding assets.
    Publicly accessible for the store profile page.
    """
    try:
        store = Store.objects.prefetch_related("products__sizes", "products__images").get(pk=pk)
    except Store.DoesNotExist:
        return Response({"error": "Store not found"}, status=404)

    # ✅ Product list with size & image info
    products_data = []
    for product in store.products.all():
        sizes = [
            {
                "size_label": s.size_label,
                "price": float(s.price),
                "quantity": s.quantity,
            }
            for s in product.sizes.all()
        ]
        images = [
            request.build_absolute_uri(img.image.url)
            for img in product.images.all()
            if img.image
        ]

        products_data.append({
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "description": product.description,
            "main_image": request.build_absolute_uri(product.main_image.url)
            if product.main_image else None,
            "sizes": sizes,
            "images": images,
            "created_at": product.created_at,
            "store_name": store.store_name,
            "store_id": store.id,
        })

    # ✅ Store profile details
    data = {
        "id": store.id,
        "store_name": store.store_name,
        "owner": store.owner.username,
        "phone": store.phone,
        "place": store.place,
        "category": store.category,
        "bio": store.bio,
        "logo": request.build_absolute_uri(store.logo.url) if store.logo else None,
        "cover_image": request.build_absolute_uri(store.cover_image.url) if store.cover_image else None,
        "created_at": store.created_at,
        "products": products_data,
    }

    return Response(data, status=200)

# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import Store
from core.serializers import StoreSerializer


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_store_profile(request):
    """
    Allow authenticated store owners to update their own store profile.
    Includes updating logo, cover image, and other details.
    """
    try:
        store = Store.objects.get(owner=request.user)
    except Store.DoesNotExist:
        return Response({"error": "Store not found for this user."}, status=404)

    serializer = StoreSerializer(store, data=request.data, partial=True, context={"request": request})

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_store(request):
    """
    Return current store owner's store profile.
    """
    try:
        store = Store.objects.get(owner=request.user)
    except Store.DoesNotExist:
        return Response({"error": "Store not found"}, status=404)

    serializer = StoreSerializer(store, context={"request": request})
    return Response(serializer.data, status=200)

class PublicStoreListView(generics.ListAPIView):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.AllowAny]
