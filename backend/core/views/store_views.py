from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from core.models import Store
from core.serializers import StoreSerializer


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


# core/views.py
class SwitchToStoreView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if hasattr(user, 'store'):
            return Response({"detail": "Store already exists."}, status=400)

        data = request.data

        store = Store.objects.create(
            owner=user,
            store_name=data.get("store_name"),
            place=data.get("place"),
            category=data.get("category"),
            phone=data.get("phone"),
        )

        user.is_store = True
        user.save(update_fields=["is_store"])

        return Response(StoreSerializer(store).data, status=201)


# ✅ FINALIZED store_detail VIEW
# ✅ FINALIZED store_detail VIEW (RESTORED PRICE + DETAILS)
@api_view(["GET"])
def store_detail(request, pk):
    try:
        store = Store.objects.get(pk=pk)
    except Store.DoesNotExist:
        return Response({"error": "Store not found"}, status=404)

    # PRODUCT FETCHING
    products = store.products.select_related(
        "store_category",
        "store_subcategory",
        "offer_category",
    ).prefetch_related("sizes", "images")

    # =============================
    # FULL PRODUCT SERIALIZER
    # =============================
    def serialize_product(p):
        first_size = p.sizes.first()
        price = float(first_size.price) if first_size else None

        return {
            "id": p.id,
            "name": p.name,
            "price": price,
            "description": p.description,

            "store_id": p.store.id,
            "store_name": p.store.store_name,

            "store_category": p.store_category.name if p.store_category else None,
            "store_subcategory": p.store_subcategory.name if p.store_subcategory else None,
            "offer_category": p.offer_category.title if p.offer_category else None,

            "main_image": request.build_absolute_uri(p.main_image.url)
            if p.main_image else None,

            "images": [
                request.build_absolute_uri(img.image.url)
                for img in p.images.all()
                if img.image
            ],

            "sizes": [
                {
                    "size_label": s.size_label,
                    "price": float(s.price),
                    "quantity": s.quantity
                }
                for s in p.sizes.all()
            ],

            "created_at": p.created_at,
        }

    # =============================
    # CATEGORY BLOCKS
    # =============================
    category_blocks = [
        {
            "id": c.id,
            "name": c.name,
            "dp_image": request.build_absolute_uri(c.dp_image.url)
            if hasattr(c, "dp_image") and c.dp_image else None,
        }
        for c in store.categories.all()
    ]

    # =============================
    # SUBCATEGORY BLOCKS
    # =============================
    subcategory_blocks = {}
    for cat in store.categories.all():
        subcategory_blocks[cat.name] = [
            {
                "id": s.id,
                "name": s.name,
                "dp_image": request.build_absolute_uri(s.dp_image.url)
                if hasattr(s, "dp_image") and s.dp_image else None,
            }
            for s in cat.subcategories.all()
        ]

    # =============================
    # OFFER BANNERS
    # =============================
    offer_blocks = [
        {
            "id": o.id,
            "title": o.title,
            "banner_image": request.build_absolute_uri(o.banner_image.url)
            if o.banner_image else None,
            "start_date": o.start_date,
            "end_date": o.end_date,
            "is_active": o.is_active,
        }
        for o in store.offer_categories.all()
    ]

    # =============================
    # OFFER GROUPS (FULL PRODUCT)
    # =============================
    offer_groups = {}
    for p in products:
        if p.offer_category:
            title = p.offer_category.title
            offer_groups.setdefault(title, []).append(serialize_product(p))

    # =============================
    # CATEGORY GROUPS (FULL PRODUCT)
    # =============================
    category_groups = {}
    for p in products:
        cat = p.store_category.name if p.store_category else "Uncategorized"
        sub = p.store_subcategory.name if p.store_subcategory else "Other"

        category_groups.setdefault(cat, {})
        category_groups[cat].setdefault(sub, [])
        category_groups[cat][sub].append(serialize_product(p))

    # =============================
    # FINAL RESPONSE
    # =============================
    data = {
        "id": store.id,
        "store_name": store.store_name,
        "place": store.place,
        "phone": store.phone,
        "bio": store.bio,

        "logo": request.build_absolute_uri(store.logo.url) if store.logo else None,
        "cover_image": request.build_absolute_uri(store.cover_image.url) if store.cover_image else None,

        "category_blocks": category_blocks,
        "subcategory_blocks": subcategory_blocks,
        "offer_blocks": offer_blocks,

        "offer_groups": offer_groups,
        "category_groups": category_groups,
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
