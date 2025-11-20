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
