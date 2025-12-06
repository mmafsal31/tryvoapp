from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth import get_user_model
from .models import (
    Store,
    Product,
    ProductSize,
    Reservation,
    Sale,
    Advertisement,
    StoreCategory,
    StoreSubCategory,
    OfferCategory,
 
)

User = get_user_model()

# -----------------------
# USER & STORE MANAGEMENT
# -----------------------
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "phone", "is_store", "is_active", "date_joined")
    list_filter = ("is_store", "is_active", "is_staff")
    search_fields = ("username", "email", "phone")
    ordering = ("-date_joined",)
    list_per_page = 25


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("store_name", "owner", "place", "category", "phone", "created_at")
    search_fields = ("store_name", "owner__username", "place")
    list_filter = ("category", "created_at")
    ordering = ("-created_at",)
    list_per_page = 25


# -----------------------
# PRODUCT MANAGEMENT
# -----------------------
class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "store",
        "store_category",
        "store_subcategory",
        "offer_category",
        "preview_image",
        "created_at",
    )

    list_filter = (
        "store",
        "store_category",
        "store_subcategory",
        "offer_category",
    )

    search_fields = ("name", "keywords", "store__store_name")

    inlines = [ProductSizeInline]
    ordering = ("-created_at",)
    list_per_page = 25

    def preview_image(self, obj):
        if obj.main_image:
            return format_html(
                '<img src="{}" width="60" height="60" style="object-fit: cover; border-radius: 8px;" />',
                obj.main_image.url,
            )
        return "No Image"

    preview_image.short_description = "Preview"

@admin.register(StoreCategory)
class StoreCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "store", "created_at")
    list_filter = ("store",)
    search_fields = ("name", "store__store_name")
    ordering = ("name",)

    # Restrict to owner’s store only
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "store"):
            return qs.filter(store=request.user.store)
        return qs.none()

    # Auto-assign store (store owner can't choose other stores)
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "store" and hasattr(request.user, "store"):
            kwargs["queryset"] = Store.objects.filter(owner=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
@admin.register(StoreSubCategory)
class StoreSubCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "store_name", "created_at")
    list_filter = ("category__store", "category")
    search_fields = ("name", "category__name")
    ordering = ("name",)

    def store_name(self, obj):
        return obj.category.store.store_name
    store_name.short_description = "Store"

    # Restrict to owner only
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "store"):
            return qs.filter(category__store=request.user.store)
        return qs.none()

    # Only show categories of logged-in store owner
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "category" and hasattr(request.user, "store"):
            kwargs["queryset"] = StoreCategory.objects.filter(store=request.user.store)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(OfferCategory)
class OfferCategoryAdmin(admin.ModelAdmin):
    list_display = ("title", "store", "start_date", "end_date", "is_active", "created_at")
    list_filter = ("store",)
    search_fields = ("title", "store__store_name")
    ordering = ("-start_date",)

    # Restrict to owner's data
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "store"):
            return qs.filter(store=request.user.store)
        return qs.none()

    # Only allow assigning owner’s store
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "store" and hasattr(request.user, "store"):
            kwargs["queryset"] = Store.objects.filter(owner=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

# -----------------------
# RESERVATION MANAGEMENT
# -----------------------
@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "product",
        "size",
        "advance_amount",
        "status",
        "unique_code",
        "reserved_until",
        "created_at",
    )
    list_filter = ("status", "reserved_until")
    search_fields = ("customer__username", "product__name", "unique_code")
    ordering = ("-created_at",)
    list_per_page = 30


# -----------------------
# SALES MANAGEMENT
# -----------------------

from .models import CustomerCredit, Return

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "store",
        "invoice_no",
        "customer_name",
        "customer_phone",
        "total_amount",
        "is_credit",
        "credit_amount",
        "created_at",
    )
    list_filter = ("store", "is_credit", "created_at")
    search_fields = ("store__store_name", "customer_name", "customer_phone", "invoice_no")
    ordering = ("-created_at",)
    list_per_page = 30
    readonly_fields = ("created_at",)


@admin.register(CustomerCredit)
class CustomerCreditAdmin(admin.ModelAdmin):
    list_display = ("id", "store", "customer_name", "customer_phone", "amount", "created_at")
    list_filter = ("store",)
    search_fields = ("customer_name", "customer_phone")
    ordering = ("-created_at",)


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ("id", "store", "invoice_no", "processed_by", "created_at")
    list_filter = ("store", "created_at")
    search_fields = ("invoice_no", "store__store_name", "processed_by__username")
    readonly_fields = ("created_at",)


# -----------------------
# ADVERTISEMENT MANAGEMENT
# -----------------------
@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ("title", "media_type", "active", "created_at")
    list_filter = ("active", "media_type")
    search_fields = ("title",)
    ordering = ("-created_at",)
    list_per_page = 20

# attendance/admin.py
from django.contrib import admin
from .models import Staff, Attendance, SalaryRecord

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('name', 'position', 'owner', 'salary_per_day', 'created_at')
    list_filter = ('owner', 'position')

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('staff', 'date', 'status', 'override_amount', 'owner')
    list_filter = ('status', 'date', 'owner')

@admin.register(SalaryRecord)
class SalaryRecordAdmin(admin.ModelAdmin):
    list_display = ('staff', 'year', 'month', 'total_amount', 'is_paid', 'computed_at', 'owner')
    list_filter = ('is_paid', 'year', 'month', 'owner')

