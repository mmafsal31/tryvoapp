# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from core.views.auth_views import RegisterView, CustomLoginView, get_user_info
from core.views.store_views import (
    StoreViewSet,
    SwitchToStoreView,
    update_store_profile,
    my_store,
    store_detail,
    PublicStoreListView,
)
from core.views.product_views import ProductViewSet, PublicProductListView, ProductSizeViewSet
from core.views.reservation_views import (
    ReservationViewSet,
    VerifyReservationCodeView,
    create_reservation_sale,
    my_store_reservations,
)
from core.views.sales_views import (
    create_sale,
    get_customer_info,
    process_return,
    settle_credit,
)
from core.views.analytics_views import store_sales_summary
from core.views.advertisement_views import AdvertisementViewSet
from core.views.attendance_views import StaffViewSet, AttendanceViewSet, SalaryRecordViewSet
from core.views.buynow_views import BuyNowOrderViewSet

# ---------------------------
# REST Router Registrations
# ---------------------------
router = DefaultRouter()
router.register(r"stores", StoreViewSet, basename="store")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"product-sizes", ProductSizeViewSet, basename="productsize")
router.register(r"ads", AdvertisementViewSet, basename="advertisement")
router.register(r"reservations", ReservationViewSet, basename="reservation")
router.register(r"staff", StaffViewSet, basename="staff")
router.register(r"attendance", AttendanceViewSet, basename="attendance")
router.register(r"salary-records", SalaryRecordViewSet, basename="salaryrecord")
router.register(r"buy-now-orders", BuyNowOrderViewSet, basename="buynoworder")

# ---------------------------
# URL Patterns
# ---------------------------
urlpatterns = [
    # Authentication
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomLoginView.as_view(), name="login"),

    # User Info
    path("user/", get_user_info, name="user-info"),

    # Store & POS
    path("create_reservation_sale/", create_reservation_sale, name="create_reservation_sale"),
    path("switch-to-store/", SwitchToStoreView.as_view(), name="switch-to-store"),
    path("pos/create-sale/", create_sale, name="create-sale"),
    path("pos/get-customer-info/", get_customer_info, name="get_customer_info"),
    path("pos/sales-dashboard/", store_sales_summary, name="store-sales-summary"),
    path("pos/process-return/", process_return, name="process-return"),
    path("settle-credit/", settle_credit, name="settle-credit"),
    path("store/<int:pk>/", store_detail, name="store-detail"),
    path("store/update/", update_store_profile, name="update_store_profile"),
    path("store/my_store/", my_store, name="my_store"),
    path("store/my_store_reservations/", my_store_reservations, name="my_store_reservations"),

    # Public Endpoints
    path("products/all/", PublicProductListView.as_view(), name="public-products"),
    path("stores/public/", PublicStoreListView.as_view(), name="public-stores"),

    # Reservation
    path("reservations/verify-code/<int:pk>/", VerifyReservationCodeView.as_view(), name="verify-reservation-code"),

    # Include all ViewSets (Router)
    path("", include(router.urls)),
]
