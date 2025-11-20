# core/views.py
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied

from .models import Store, Product, ProductSize, Reservation, Sale
from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    StoreSerializer,
    ProductSerializer,
    ProductSizeSerializer,
    ReservationSerializer,
    SaleSerializer
)

User = get_user_model()

# -------------------------------------------------------------------
# AUTH & REGISTRATION
# -------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """Handles new user registration and JWT token creation."""
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        data = {
            "user": serializer.data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
        return Response(data, status=status.HTTP_201_CREATED)


class CustomLoginView(TokenObtainPairView):
    """JWT login with custom serializer."""
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_info(request):
    """Return the authenticated user’s profile data."""
    serializer = RegisterSerializer(request.user)
    return Response(serializer.data)


# -------------------------------------------------------------------
# STORE MANAGEMENT
# -------------------------------------------------------------------

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

# -------------------------------------------------------------------
# PRODUCT MANAGEMENT
# -------------------------------------------------------------------

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
from .models import Product
from .serializers import ProductSerializer

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
from .models import Product
from .serializers import ProductSerializer


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


# -------------------------------------------------------------------
# RESERVATIONS
# -------------------------------------------------------------------

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = (
        Reservation.objects.select_related(
            "product", "product__store", "size", "customer"
        )
        .prefetch_related("product__images", "product__sizes")
        .order_by("-created_at")
    )
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 🧠 Store users see their store's reservations
        if getattr(user, "is_store", False) and hasattr(user, "store"):
            return self.queryset.filter(product__store=user.store)
        # 🧠 Normal users see their own reservations
        return self.queryset.filter(customer=user)

    def perform_create(self, serializer):
        user = self.request.user
        reservation = serializer.save(customer=user)

        # 🧩 Attach store automatically (from product or user's store)
        if hasattr(reservation.product, "store"):
            reservation.store = reservation.product.store
        elif hasattr(user, "store"):
            reservation.store = user.store
        reservation.save()

    @action(detail=False, methods=["get"], url_path="my_store")
    def my_store_reservations(self, request):
        user = request.user
        if not getattr(user, "is_store", False):
            return Response(
                {"detail": "Not authorized as a store user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reservations = self.queryset.filter(product__store=user.store)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

# ---------------------- PUBLIC PRODUCT LIST ----------------------
class PublicProductListView(generics.ListAPIView):
    """Public endpoint to view all active products."""
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Product.objects.all().select_related("store").order_by("-id")
    
from decimal import Decimal
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Store, Product, ProductSize, Sale

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_sale_old(request):
    user = request.user

    if not user.is_store:
        return Response({"detail": "Not authorized"}, status=403)

    try:
        store = Store.objects.get(owner=user)
    except Store.DoesNotExist:
        return Response({"detail": "Store not found"}, status=404)

    cart = request.data.get("cart", [])
    if not cart:
        return Response({"detail": "Cart is empty"}, status=400)

    total = Decimal("0.00")
    sale_items = []

    try:
        with transaction.atomic():
            for item in cart:
                product_id = item.get("id")
                quantity = int(item.get("quantity", 0))
                sizes = item.get("sizes", [])
                if not sizes:
                    continue

                size_label = sizes[0].get("size_label")
                price = Decimal(str(sizes[0].get("price", 0)))

                product = Product.objects.get(id=product_id, store=store)
                size_obj = ProductSize.objects.get(product=product, size_label=size_label)

                if size_obj.quantity < quantity:
                    raise ValueError(f"Not enough stock for {product.name} ({size_label})")

                # Deduct stock
                size_obj.quantity -= quantity
                size_obj.save()

                total += price * quantity
                sale_items.append({
                    "name": product.name,
                    "size": size_label,
                    "price": float(price),
                    "quantity": quantity
                })

            sale = Sale.objects.create(store=store, products=sale_items, total_amount=total)

        return Response({
            "message": "✅ Sale recorded successfully!",
            "sale_id": sale.id,
            "total": float(total),
            "items": sale_items
        }, status=status.HTTP_201_CREATED)

    except Product.DoesNotExist:
        return Response({"detail": "Product not found"}, status=404)
    except ValueError as e:
        return Response({"detail": str(e)}, status=400)
    except Exception as e:
        return Response({"detail": str(e)}, status=500)


from django.utils.timezone import now, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Sale, Store, Reservation
from django.db.models import Sum
import math

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def store_sales_summary(request):
    user = request.user
    if not user.is_store:
        return Response({"detail": "Not authorized"}, status=403)

    try:
        store = Store.objects.get(owner=user)
    except Store.DoesNotExist:
        return Response({"detail": "Store not found"}, status=404)

    # ====== POS SALES DATA ======
    sales = Sale.objects.filter(store=store)
    total_sales = sales.count()
    total_pos_revenue = float(sales.aggregate(total=Sum("total_amount"))["total"] or 0)

    # ====== RESERVATION DATA ======
    reservations = Reservation.objects.filter(product__store=store)
    total_reservations = reservations.count()
    converted_reservations = reservations.filter(status="completed").count()

    # Reservation revenue = sum of advance_amount + converted sale revenue if any
    total_reservation_revenue = float(
        reservations.aggregate(total=Sum("advance_amount"))["total"] or 0
    )

    # Conversion rate %
    reservation_conversion_rate = (
        round((converted_reservations / total_reservations) * 100, 2)
        if total_reservations > 0
        else 0
    )

    # ====== Combined Revenue ======
    total_revenue = total_pos_revenue + total_reservation_revenue
    avg_order_value = round(total_revenue / (total_sales + total_reservations), 2) if (total_sales + total_reservations) > 0 else 0

    # ====== 7-DAY TREND ======
    today = now().date()
    last_7_days = [
        {
            "day": (today - timedelta(days=i)).strftime("%b %d"),
            "pos_total": 0.0,
            "reservation_total": 0.0,
        }
        for i in reversed(range(7))
    ]

    # POS trend
    for sale in sales.filter(created_at__gte=today - timedelta(days=7)):
        day_label = sale.created_at.strftime("%b %d")
        for d in last_7_days:
            if d["day"] == day_label:
                d["pos_total"] += float(sale.total_amount)

    # Reservation trend
    for r in reservations.filter(created_at__gte=today - timedelta(days=7)):
        day_label = r.created_at.strftime("%b %d")
        for d in last_7_days:
            if d["day"] == day_label:
                d["reservation_total"] += float(r.advance_amount)

    # ====== CATEGORY BREAKDOWN ======
    category_sales = {}
    for sale in sales:
        category = getattr(sale.store, "category", "Other") or "Other"
        category_sales[category] = category_sales.get(category, 0) + float(sale.total_amount)

    for r in reservations:
        category = getattr(r.product.store, "category", "Other") or "Other"
        category_sales[category] = category_sales.get(category, 0) + float(r.advance_amount)

    category_sales_list = [
        {"category": k, "revenue": round(v, 2)} for k, v in category_sales.items()
    ]

    # ====== TOP PRODUCTS ======
    product_stats = {}
    # POS sales
    for sale in sales:
        for item in sale.products:
            name = item.get("product") or item.get("name") or "Unknown"
            qty = int(item.get("quantity", 1))
            product_stats.setdefault(name, {"quantity": 0, "reservation_quantity": 0})
            product_stats[name]["quantity"] += qty

    # Reservation sales
    for r in reservations:
        name = r.product.name
        product_stats.setdefault(name, {"quantity": 0, "reservation_quantity": 0})
        product_stats[name]["reservation_quantity"] += r.quantity

    top_products = [
        {
            "name": k,
            "quantity": v["quantity"],
            "reservation_quantity": v["reservation_quantity"],
        }
        for k, v in product_stats.items()
    ]
    top_products.sort(
        key=lambda x: (x["quantity"] + x["reservation_quantity"]), reverse=True
    )

    # ====== RETURNING CUSTOMERS ======
    customer_sales = {}
    for sale in sales:
        customer = getattr(sale, "customer", None)
        if customer:
            customer_sales[customer] = customer_sales.get(customer, 0) + 1
    for r in reservations:
        customer = getattr(r, "customer", None)
        if customer:
            customer_sales[customer] = customer_sales.get(customer, 0) + 1
    returning_customers = sum(1 for count in customer_sales.values() if count > 1)

    # ====== RESPONSE ======
    return Response({
        "store_name": store.store_name,
        "total_sales": total_sales,
        "total_reservations": total_reservations,
        "converted_reservations": converted_reservations,
        "reservation_conversion_rate": reservation_conversion_rate,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": avg_order_value,
        "returning_customers": returning_customers,
        "daily_sales": last_7_days,
        "category_sales": category_sales_list,
        "top_products": top_products[:5],
    })


# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from core.models import Product
from core.serializers import ProductSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def product_detail(request, pk):
    try:
        product = Product.objects.select_related("store").get(pk=pk)
    except Product.DoesNotExist:
        return Response({"detail": "Product not found"}, status=404)

    serializer = ProductSerializer(product)
    data = serializer.data

    # ✅ Add store info
    data["store_name"] = product.store.store_name if product.store else None
    data["store_id"] = product.store.id if product.store else None

    return Response(data)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import ProductSize

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_stock_after_sale(request):
    """
    Reduce stock quantities after a successful sale.
    Payload example:
    {
        "items": [
            {"size_id": 12, "quantity": 2},
            {"size_id": 15, "quantity": 1}
        ]
    }
    """
    try:
        items = request.data.get("items", [])
        for item in items:
            size_id = item.get("size_id")
            qty = int(item.get("quantity", 0))
            if not size_id or qty <= 0:
                continue

            size = ProductSize.objects.filter(id=size_id).first()
            if not size:
                continue

            if size.quantity < qty:
                return Response(
                    {"error": f"Insufficient stock for size {size.size_label}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            size.quantity -= qty
            size.save()

        return Response({"success": True, "message": "Stock updated successfully"})
    except Exception as e:
        print("Error updating stock:", e)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework import generics, permissions
from .models import Product
from .serializers import ProductSerializer


class PublicProductListView(generics.ListAPIView):

    """Public endpoint: anyone can see all store products"""
    queryset = Product.objects.all().select_related("store")
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

# core/views.py

# core/views.py
# core/views.py

from decimal import Decimal
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Reservation, Sale, ProductSize


# -------------------------------------------------------------------
# ✅ VERIFY RESERVATION CODE
# -------------------------------------------------------------------
class VerifyReservationCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """
        Verify a reservation's unique code, mark it complete,
        deduct stock, and log a sale automatically.
        """
        try:
            reservation = Reservation.objects.select_related(
                "product", "product__store", "size"
            ).get(pk=pk)
        except Reservation.DoesNotExist:
            return Response(
                {"success": False, "message": "Reservation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        input_code = str(request.data.get("code", "")).strip()
        if not input_code:
            return Response(
                {"success": False, "message": "Reservation code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if input_code != str(reservation.unique_code).strip():
            return Response(
                {"success": False, "message": "Invalid reservation code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check expiration
        if reservation.is_expired():
            reservation.status = "expired"
            reservation.save()
            return Response(
                {"success": False, "message": "Reservation expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ Deduct stock safely
        size = reservation.size
        if size.quantity < reservation.quantity:
            return Response(
                {
                    "success": False,
                    "message": f"Not enough stock for {size.product.name} ({size.size_label}).",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        size.quantity -= reservation.quantity
        size.save()

        # ✅ Mark reservation as completed
        reservation.status = "completed"
        reservation.save()

        # ✅ Automatically log sale
        Sale.objects.create(
            store=reservation.product.store,
            products=[
                {
                    "product": reservation.product.name,
                    "size": reservation.size.size_label,
                    "price": str(reservation.size.price),
                    "quantity": reservation.quantity,
                    "advance_amount": str(reservation.advance_amount),
                }
            ],
            total_amount=Decimal(reservation.advance_amount),
        )

        return Response(
            {
                "success": True,
                "message": "Reservation verified and stock updated successfully.",
                "discount": 150,
            },
            status=status.HTTP_200_OK,
        )

# -------------------------------------------------------------------
# ✅ CREATE SALE (POS Checkout)
# -------------------------------------------------------------------
# -------------------------------------------------------------------
# ✅ CREATE SALE (POS Checkout) — Updated Version
# -------------------------------------------------------------------
from decimal import Decimal
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response
from .models import (
    Sale, ProductSize, Reservation, CustomerCredit, Return, Store, Product, generate_invoice_no
)

# -------------------------------
# GET CUSTOMER INFO
# -------------------------------
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_customer_info(request):
    """Fetch customer info and outstanding credit by phone"""
    phone = request.query_params.get("phone")
    user = request.user

    if not phone:
        return Response({"success": False, "message": "Phone number required."}, status=400)

    store = getattr(user, "store", None)
    if not store:
        return Response({"success": False, "message": "User not linked to store."}, status=400)

    latest_sale = (
        Sale.objects.filter(store=store, customer_phone=phone)
        .order_by("-created_at")
        .first()
    )
    credit_entries = CustomerCredit.objects.filter(store=store, customer_phone=phone)
    outstanding = sum([c.amount for c in credit_entries], Decimal("0.00"))

    return Response({
        "success": True,
        "data": {
            "name": latest_sale.customer_name if latest_sale else "",
            "phone": phone,
            "outstanding_credit": str(outstanding),
        }
    })


# -------------------------------
# CREATE SALE
# -------------------------------
from decimal import Decimal
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response

from .models import Sale, Reservation, ProductSize, CustomerCredit


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def create_sale(request):
    """
    Handles sale creation, reservation linkage, credit settlement, and stock deduction.
    Works for both direct store checkout and reservation checkout.
    """
    print("=== 🧾 DEBUG: POS Checkout Payload ===")
    print(request.data)

    try:
        user = request.user
        data = request.data

        # Extract payload
        cart = data.get("cart", [])
        discount = Decimal(str(data.get("discount", 0) or 0))
        subtotal = Decimal(str(data.get("subtotal", 0) or 0))
        total = Decimal(str(data.get("total", 0) or 0))
        reservation_id = data.get("reservation_id")
        customer = data.get("customer", {}) or {}
        payment = data.get("payment", {}) or {}

        if not cart:
            return Response(
                {"success": False, "message": "Cart cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate store linkage
        store = getattr(user, "store", None)
        if not store:
            return Response(
                {"success": False, "message": "User not linked to a store."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ STOCK CHECK & DEDUCTION
        product_ids = [item.get("id") or item.get("product_id") for item in cart]
        size_objs = ProductSize.objects.filter(product_id__in=product_ids)
        size_map = {(s.product_id, s.size_label): s for s in size_objs}

        for item in cart:
            product_id = item.get("id") or item.get("product_id")
            qty = int(item.get("quantity", 0))
            size_label = (
                item.get("size_label")
                or (item.get("sizes", [{}])[0].get("size_label") if item.get("sizes") else None)
            )

            size_obj = size_map.get((product_id, size_label))
            if not size_obj:
                return Response(
                    {"success": False, "message": f"Invalid size for product {product_id}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if size_obj.quantity < qty:
                return Response(
                    {
                        "success": False,
                        "message": f"Insufficient stock for {size_obj.product.name} ({size_label}).",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            size_obj.quantity -= qty
            size_obj.save()

        # ✅ RESERVATION LINKING
        reservation = None
        if reservation_id:
            try:
                reservation = Reservation.objects.get(id=reservation_id)
                # Ensure reservation belongs to this store
                if reservation.product.store != store:
                    return Response(
                        {"success": False, "message": "Reservation does not belong to this store."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Mark reservation as completed
                reservation.status = "completed"
                reservation.save()
            except Reservation.DoesNotExist:
                return Response(
                    {"success": False, "message": "Invalid reservation ID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ✅ SALE CREATION
        sale = Sale.objects.create(
            store=store,
            products=cart,
            subtotal=subtotal,
            discount=discount,
            total_amount=total,
            customer_name=customer.get("name"),
            customer_phone=customer.get("phone"),
            payment=payment,
            reservation=reservation,
        )

        # ✅ PAYMENT LOGIC
        paid = Decimal(str(payment.get("paid_amount", 0)))
        credit = Decimal(str(payment.get("credit_amount", 0)))
        settle_amount = Decimal(str(payment.get("settle_credit_amount", 0) or 0))
        customer_phone = customer.get("phone")

        # Handle new credit sales
        if credit > 0:
            sale.is_credit = True
            sale.credit_amount = credit
            sale.save()

            CustomerCredit.objects.create(
                store=store,
                customer_name=customer.get("name"),
                customer_phone=customer_phone,
                amount=credit,
                reference_sale=sale,
            )

        # Handle credit settlement (if paying back old debts)
        if settle_amount > 0 and customer_phone:
            credits = CustomerCredit.objects.filter(
                store=store, customer_phone=customer_phone
            ).order_by("-created_at")
            remaining = settle_amount
            for credit_entry in credits:
                if remaining <= 0:
                    break
                if credit_entry.amount <= remaining:
                    remaining -= credit_entry.amount
                    credit_entry.amount = 0
                else:
                    credit_entry.amount -= remaining
                    remaining = 0
                credit_entry.save()

        return Response(
            {
                "success": True,
                "message": "Sale created successfully.",
                "data": {
                    "sale_id": sale.id,
                    "invoice_no": sale.invoice_no,
                    "total": str(total),
                },
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        # Roll back automatically handled by @transaction.atomic
        return Response(
            {"success": False, "message": f"Error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# -------------------------------
# PROCESS RETURN
# -------------------------------
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def process_return(request):
    """Process product return"""
    try:
        user = request.user
        store = getattr(user, "store", None)
        payload = request.data
        sale_item = payload.get("sale_item")
        reason = payload.get("reason", "")
        invoice_no = payload.get("invoice_no")

        if not (store and sale_item):
            return Response({"success": False, "message": "Invalid data."}, status=400)

        product_id = sale_item.get("product_id") or sale_item.get("id")
        size_label = sale_item.get("size_label")
        qty = int(sale_item.get("quantity", 0))

        size_obj = ProductSize.objects.get(product_id=product_id, size_label=size_label)
        size_obj.quantity += qty
        size_obj.save()

        Return.objects.create(
            store=store,
            sale_item=sale_item,
            reason=reason,
            invoice_no=invoice_no,
            processed_by=user,
        )

        return Response({"success": True, "message": "Return processed."}, status=201)

    except Exception as e:
        return Response({"success": False, "message": str(e)}, status=500)


# -------------------------------
# SETTLE CREDIT (Manual endpoint)
# -------------------------------
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def settle_credit(request):
    """Manually deduct a settled amount from a customer's outstanding credit"""
    user = request.user
    store = getattr(user, "store", None)
    if not store:
        return Response({"success": False, "message": "User not linked to store."}, status=400)

    phone = request.data.get("phone")
    amount = Decimal(str(request.data.get("amount") or 0))

    if not phone or amount <= 0:
        return Response({"success": False, "message": "Invalid phone or amount."}, status=400)

    try:
        credits = CustomerCredit.objects.filter(store=store, customer_phone=phone).order_by("-created_at")
        total_credit = sum(c.amount for c in credits)
        if total_credit <= 0:
            return Response({"success": False, "message": "No outstanding credit to settle."}, status=400)

        if amount > total_credit:
            amount = total_credit

        remaining = amount
        for credit in credits:
            if remaining <= 0:
                break
            if credit.amount <= remaining:
                remaining -= credit.amount
                credit.amount = 0
            else:
                credit.amount -= remaining
                remaining = 0
            credit.save()

        remaining_credit = sum(
            c.amount for c in CustomerCredit.objects.filter(store=store, customer_phone=phone)
        )

        return Response({
            "success": True,
            "message": f"Credit settled successfully. ₹{amount} reduced from outstanding.",
            "settled_amount": str(amount),
            "remaining_credit": str(remaining_credit),
        })

    except Exception as e:
        return Response({"success": False, "message": str(e)}, status=500)



from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAdminUser, AllowAny
from .models import Advertisement
from .serializers import AdvertisementSerializer

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
from .models import Store
from .serializers import StoreSerializer


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

# core/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import F
from core.models import (
    Store,
    Reservation,
    Sale,
    Product,
    ProductSize,
)
from decimal import Decimal
from django.utils import timezone


# core/views.py
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_reservation_sale(request):
    from decimal import Decimal
    import json
    try:
        data = request.data
        user = request.user
        store = get_object_or_404(Store, owner=user)

        reservation_id = data.get("reservation_id")
        customer_data = data.get("customer", {})
        payment_data = data.get("payment", {})
        cart_items = data.get("cart", [])

        if not reservation_id or not cart_items:
            return Response({"success": False, "message": "Invalid data"}, status=400)

        reservation = get_object_or_404(Reservation, id=reservation_id, store=store)

        subtotal = Decimal(str(data.get("subtotal", 0)))
        discount = Decimal(str(data.get("discount", 0)))
        total = Decimal(str(data.get("total", 0)))
        credit_amount = Decimal(str(payment_data.get("credit_amount", 0)))

        sale = Sale.objects.create(
            store=store,
            products=cart_items,
            subtotal=subtotal,
            discount=discount,
            total_amount=total,
            customer_name=customer_data.get("name", ""),
            customer_phone=customer_data.get("phone", ""),
            payment=json.dumps(payment_data),
            credit_amount=credit_amount,
            reservation=reservation,
            is_credit=(credit_amount > 0),
        )

        # ✅ Update product stock safely
        for item in cart_items:
            product = get_object_or_404(Product, id=item["product_id"], store=store)
            size_label = item.get("size_label", "Default")
            quantity = int(item.get("quantity", 1))

            size_obj, _ = ProductSize.objects.get_or_create(
                product=product, size_label=size_label, defaults={"quantity": 0}
            )
            size_obj.quantity = max(size_obj.quantity - quantity, 0)
            size_obj.save()

        # ✅ Mark reservation complete
        reservation.status = "completed"
        reservation.save()

        # ✅ Create credit entry if needed
        if credit_amount > 0:
            from core.models import CustomerCredit
            CustomerCredit.objects.create(
                store=store,
                customer_name=customer_data.get("name", ""),
                customer_phone=customer_data.get("phone", ""),
                amount=credit_amount,
                reference_sale=sale,
            )

        return Response(
            {
                "success": True,
                "message": "Reservation sale completed successfully",
                "invoice": sale.invoice_no,
                "total": float(sale.total_amount),
            },
            status=200,
        )

    except Exception as e:
        print("🔥 Sale creation error:", str(e))
        return Response({"success": False, "message": str(e)}, status=500)