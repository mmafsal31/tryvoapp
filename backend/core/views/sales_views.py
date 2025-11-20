from decimal import Decimal
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response
from core.models import (
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

from core.models import Sale, Reservation, ProductSize, CustomerCredit


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
