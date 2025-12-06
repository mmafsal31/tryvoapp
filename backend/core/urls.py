# core/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

# ---------------------------------------
# AUTH
# ---------------------------------------
from core.views.auth_views import (
    RegisterView,
    CustomLoginView,
    get_user_info
)

# ---------------------------------------
# STORE
# ---------------------------------------
from core.views.store_views import (
    StoreViewSet,
    SwitchToStoreView,
    update_store_profile,
    my_store,
    store_detail,
    PublicStoreListView,
)

# ---------------------------------------
# PRODUCT + CATEGORIES
# ---------------------------------------
from core.views.product_views import (
    ProductViewSet,
    ProductSizeViewSet,
    PublicProductListView,

    list_categories,
    list_subcategories,
    list_offer_categories,

    add_category,
    update_category,
    add_subcategory,
    update_subcategory,
    add_offer_category,
    update_offer_category,
    delete_offer_category,
)

# ---------------------------------------
# RESERVATIONS
# ---------------------------------------
from core.views.reservation_views import (
    ReservationViewSet,
    VerifyReservationCodeView,
    create_reservation_sale,
    my_store_reservations,
)

# ---------------------------------------
# SALES & POS
# ---------------------------------------
from core.views.sales_views import (
    create_sale,
    get_customer_info,
    process_return,
    settle_credit,
)

# ---------------------------------------
# ADVANCED ANALYTICS API (UPDATED)
# ---------------------------------------
from core.views.analytics_views import store_sales_summary

# ---------------------------------------
# ADS & STAFF MANAGEMENT
# ---------------------------------------
from core.views.advertisement_views import AdvertisementViewSet
from core.views.attendance_views import (
    StaffViewSet,
    AttendanceViewSet,
    SalaryRecordViewSet
)

# ---------------------------------------
# BUY NOW ORDERS
# ---------------------------------------
from core.views.buynow_views import BuyNowOrderViewSet


# ==========================================================
# ROUTER CONFIG
# ==========================================================
router = DefaultRouter()
router.register("stores", StoreViewSet, basename="store")
router.register("products", ProductViewSet, basename="product")
router.register("product-sizes", ProductSizeViewSet, basename="productsize")
router.register("ads", AdvertisementViewSet, basename="advertisement")
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("staff", StaffViewSet, basename="staff")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("salary-records", SalaryRecordViewSet, basename="salaryrecord")
router.register("buy-now-orders", BuyNowOrderViewSet, basename="buynoworder")


# ==========================================================
# URL PATTERNS
# ==========================================================
urlpatterns = [

    # ------------------------------------------------------
    # AUTHENTICATION
    # ------------------------------------------------------
    path("register/", RegisterView.as_view()),
    path("login/", CustomLoginView.as_view()),
    path("user/", get_user_info),

    # ------------------------------------------------------
    # STORE MANAGEMENT
    # ------------------------------------------------------
    path("store/<int:pk>/", store_detail),
    path("store/update/", update_store_profile),
    path("store/my_store/", my_store),
    path("store/my_store_reservations/", my_store_reservations),

    # ------------------------------------------------------
    # PUBLIC APIS
    # ------------------------------------------------------
    path("products/all/", PublicProductListView.as_view()),
    path("stores/public/", PublicStoreListView.as_view()),

    # ------------------------------------------------------
    # POS / SALES
    # ------------------------------------------------------
    path("create_reservation_sale/", create_reservation_sale),
    path("switch-to-store/", SwitchToStoreView.as_view()),
    path("pos/create-sale/", create_sale),
    path("pos/get-customer-info/", get_customer_info),
    path("pos/process-return/", process_return),
    path("settle-credit/", settle_credit),

    # ⭐ ADVANCED ANALYTICS API
    path("pos/sales-dashboard/", store_sales_summary),

    # ------------------------------------------------------
    # RESERVATION VERIFY + CODE
    # ------------------------------------------------------
    path("reservations/verify-code/<int:pk>/", VerifyReservationCodeView.as_view()),

    # ------------------------------------------------------
    # CATEGORY LIST APIS
    # ------------------------------------------------------
    path("stores/categories/", list_categories),
    path("stores/subcategories/<int:pk>/", list_subcategories),
    path("stores/offer-categories/", list_offer_categories),
    path("offer-category/<int:pk>/delete/", delete_offer_category),

    # ------------------------------------------------------
    # CATEGORY CRUD
    # ------------------------------------------------------
    path("category/add/", add_category),
    path("category/<int:pk>/update/", update_category),

    # ------------------------------------------------------
    # SUBCATEGORY CRUD
    # ------------------------------------------------------
    path("subcategory/add/", add_subcategory),
    path("subcategory/<int:pk>/update/", update_subcategory),

    # ------------------------------------------------------
    # OFFER CATEGORY CRUD
    # ------------------------------------------------------
    path("offer-category/add/", add_offer_category),
    path("offer-category/<int:pk>/update/", update_offer_category),

    # ------------------------------------------------------
    # ROUTER ENDPOINTS
    # ------------------------------------------------------
    path("", include(router.urls)),
]
