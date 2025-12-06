from django.utils.timezone import now, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from core.models import Sale, Store, Reservation, Product


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def store_sales_summary(request):

    user = request.user
    if not user.is_store:
        return Response({"detail": "Not authorized"}, status=403)

    # -------------------------------
    # GET STORE
    # -------------------------------
    try:
        store = Store.objects.get(owner=user)
    except Store.DoesNotExist:
        return Response({"detail": "Store not found"}, status=404)

    # -------------------------------
    # FILTERS
    # -------------------------------
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    category_filter = request.GET.get("category")
    customer_phone = request.GET.get("customer")
    customer_name = request.GET.get("customer_name")
    product_filter = request.GET.get("product")
    sale_type_filter = request.GET.get("sale_type")
    reservation_status = request.GET.get("reservation_status")

    # -------------------------------
    # BASE QUERIES
    # -------------------------------
    sales_qs = Sale.objects.filter(store=store)
    reservations_qs = Reservation.objects.filter(product__store=store)

    # -------------------------------
    # DATE RANGE FILTER
    # -------------------------------
    if start_date:
        sales_qs = sales_qs.filter(created_at__date__gte=start_date)
        reservations_qs = reservations_qs.filter(created_at__date__gte=start_date)

    if end_date:
        sales_qs = sales_qs.filter(created_at__date__lte=end_date)
        reservations_qs = reservations_qs.filter(created_at__date__lte=end_date)

    # -------------------------------
    # CATEGORY FILTER
    # -------------------------------
    if category_filter:
        sales_qs = sales_qs.filter(store__category=category_filter)
        reservations_qs = reservations_qs.filter(product__store__category=category_filter)

    # -------------------------------
    # CUSTOMER PHONE FILTER
    # -------------------------------
    if customer_phone:
        sales_qs = sales_qs.filter(customer_phone__icontains=customer_phone)
        reservations_qs = reservations_qs.filter(customer__phone__icontains=customer_phone)

    # -------------------------------
    # CUSTOMER NAME FILTER
    # -------------------------------
    if customer_name:
        sales_qs = sales_qs.filter(customer_name__icontains=customer_name)
        reservations_qs = reservations_qs.filter(customer__username__icontains=customer_name)

    # -------------------------------
    # PRODUCT FILTER
    # -------------------------------
    sales_list = list(sales_qs)

    if product_filter:
        pf = product_filter.lower()

        # Filter POS sale items
        sales_list = [
            s for s in sales_list
            if any(
                pf in (item.get("product") or "").lower()
                for item in s.products
            )
        ]

        # Filter reservation product
        reservations_qs = reservations_qs.filter(product__name__icontains=product_filter)

    # -------------------------------
    # RESERVATION STATUS
    # -------------------------------
    if reservation_status:
        reservations_qs = reservations_qs.filter(status=reservation_status)

    # -------------------------------
    # SALE TYPE
    # -------------------------------
    if sale_type_filter == "pos":
        reservations_qs = reservations_qs.none()
    elif sale_type_filter == "reservation":
        sales_list = []

    # =====================================================
    # KPI CALCULATIONS
    # =====================================================
    total_sales = len(sales_list)
    pos_revenue = sum(float(s.total_amount) for s in sales_list)

    total_reservations = reservations_qs.count()
    completed_reservations = reservations_qs.filter(status="completed").count()

    reservation_revenue = float(
        reservations_qs.aggregate(total=Sum("advance_amount"))["total"] or 0
    )

    total_revenue = pos_revenue + reservation_revenue
    total_orders = total_sales + total_reservations
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0

    conversion_rate = (
        round(completed_reservations / total_reservations * 100, 2)
        if total_reservations else 0
    )

    # =====================================================
    # WEEKLY TREND
    # =====================================================
    today = now().date()
    daily_sales = []

    for i in range(7):
        d = today - timedelta(days=6 - i)
        label = d.strftime("%b %d")

        pos_total = sum(
            float(s.total_amount)
            for s in sales_list
            if s.created_at.date() == d
        )

        res_total = float(
            reservations_qs.filter(created_at__date=d)
            .aggregate(total=Sum("advance_amount"))["total"] or 0
        )

        daily_sales.append({
            "day": label,
            "pos_total": pos_total,
            "reservation_total": res_total,
        })

    # =====================================================
    # CATEGORY BREAKDOWN
    # =====================================================
    category_map = {}

    for sale in sales_list:
        cat = store.category or "Other"
        category_map[cat] = category_map.get(cat, 0) + float(sale.total_amount)

    for r in reservations_qs:
        cat = r.product.store.category or "Other"
        category_map[cat] = category_map.get(cat, 0) + float(r.advance_amount)

    category_sales = [
        {"category": c, "revenue": round(v, 2)}
        for c, v in category_map.items()
    ]

    # =====================================================
    # TOP PRODUCTS
    # =====================================================
    product_stats = {}

    for sale in sales_list:
        for item in sale.products:
            name = item.get("product") or "Unknown Product"
            qty = int(item.get("quantity", 0))

            product_stats.setdefault(name, {"quantity": 0, "reservation_quantity": 0})
            product_stats[name]["quantity"] += qty

    for r in reservations_qs:
        name = r.product.name
        product_stats.setdefault(name, {"quantity": 0, "reservation_quantity": 0})
        product_stats[name]["reservation_quantity"] += r.quantity

    top_products = sorted(
        [
            {
                "name": name,
                "quantity": stats["quantity"],
                "reservation_quantity": stats["reservation_quantity"],
                "total_sold": stats["quantity"] + stats["reservation_quantity"],
            }
            for name, stats in product_stats.items()
        ],
        key=lambda x: x["total_sold"],
        reverse=True
    )[:10]

    # =====================================================
    # CUSTOMER ANALYTICS + FULL ORDER DETAILS
    # =====================================================
    customer_map = {}
    customer_orders = []

    # ------- POS ORDERS -------
    for sale in sales_list:

        # FIXED PRODUCT NAME + SIZE DISPLAY
        item_string = ", ".join([
            f"{(i.get('product') or 'Unknown Product')} "
            f"{'(' + i.get('size') + ')' if i.get('size') else ''} × {i.get('quantity')}"
            for i in sale.products
        ])

        entry = {
            "name": sale.customer_name or "Unknown",
            "phone": sale.customer_phone or "N/A",
            "order_id": sale.id,
            "type": "pos",
            "items": item_string,
            "amount": float(sale.total_amount),
            "date": sale.created_at.strftime("%Y-%m-%d %H:%M"),
            "status": "completed",
        }
        customer_orders.append(entry)

        phone = entry["phone"]
        c = customer_map.setdefault(phone, {
            "name": entry["name"],
            "phone": phone,
            "pos_orders": 0,
            "reservations": 0,
            "total_orders": 0,
            "total_spent": 0,
            "last_purchase": None,
        })

        c["pos_orders"] += 1
        c["total_orders"] += 1
        c["total_spent"] += entry["amount"]
        c["last_purchase"] = sale.created_at

    # ------- RESERVATION ORDERS -------
    for r in reservations_qs:

        item_string = f"{r.product.name} ({r.size.size_label}) × {r.quantity}"

        entry = {
            "name": r.customer.username,
            "phone": r.customer.phone,
            "order_id": r.id,
            "type": "reservation",
            "items": item_string,
            "amount": float(r.advance_amount),
            "date": r.created_at.strftime("%Y-%m-%d %H:%M"),
            "status": r.status,
        }
        customer_orders.append(entry)

        phone = r.customer.phone
        c = customer_map.setdefault(phone, {
            "name": entry["name"],
            "phone": phone,
            "pos_orders": 0,
            "reservations": 0,
            "total_orders": 0,
            "total_spent": 0,
            "last_purchase": None,
        })

        c["reservations"] += 1
        c["total_orders"] += 1
        c["total_spent"] += entry["amount"]
        c["last_purchase"] = r.created_at

    # Build customer summary list
    customers_list = [
        {
            **c,
            "last_purchase": (
                c["last_purchase"].strftime("%Y-%m-%d %H:%M")
                if c["last_purchase"] else None
            )
        }
        for c in customer_map.values()
    ]

    # =====================================================
    # PRODUCT INVENTORY
    # =====================================================
    inventory = []
    for p in Product.objects.filter(store=store).prefetch_related("sizes"):
        sizes = p.sizes.all()
        total_stock = sum(s.quantity for s in sizes)
        top_size = max(sizes, key=lambda s: s.quantity).size_label if sizes else "N/A"

        inventory.append({
            "id": p.id,
            "name": p.name,
            "stock_left": total_stock,
            "top_size": top_size,
            "total_sales": product_stats.get(p.name, {}).get("quantity", 0),
            "reservation_sales": product_stats.get(p.name, {}).get("reservation_quantity", 0),
        })

    # =====================================================
    # RESPONSE
    # =====================================================
    return Response({
        "store_name": store.store_name,
        "filters_used": {
            "start_date": start_date,
            "end_date": end_date,
            "category": category_filter,
            "product": product_filter,
            "customer": customer_phone,
            "customer_name": customer_name,
            "sale_type": sale_type_filter,
            "reservation_status": reservation_status,
        },

        "total_sales": total_sales,
        "total_reservations": total_reservations,
        "converted_reservations": completed_reservations,
        "reservation_conversion_rate": conversion_rate,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": avg_order_value,

        "daily_sales": daily_sales,
        "category_sales": category_sales,
        "top_products": top_products,

        "customer_orders": customer_orders,     # <-- FULL ORDER LIST
        "customers": customers_list,            # <-- SUMMARY
        "products": inventory,
    })
