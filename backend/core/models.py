from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
from datetime import date
import uuid

# ===============================
# ✅ CUSTOM USER MODEL
# ===============================
class User(AbstractUser):
    phone = models.CharField(max_length=15, unique=True)
    place_text = models.CharField(max_length=200, null=True, blank=True)
    is_store = models.BooleanField(default=False)

    def __str__(self):
        return self.username




# ===============================
# ✅ STORE & PRODUCT SYSTEM
# ===============================
CATEGORY_CHOICES = [
    ('clothing', 'Clothing'),
    ('footwear', 'Footwear'),
]

RESERVATION_STATUS = [
    ('reserved', 'Reserved'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled'),
    ('expired', 'Expired'),
]


class Store(models.Model):
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="store")
    store_name = models.CharField(max_length=100)
    place = models.CharField(max_length=150)
    phone = models.CharField(max_length=15)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)

    # ✅ New fields for visual branding
    logo = models.ImageField(
        upload_to="stores/logos/",
        blank=True,
        null=True,
        help_text="Store display picture (profile image)",
    )
    cover_image = models.ImageField(
        upload_to="stores/banners/",
        blank=True,
        null=True,
        help_text="Background banner for store profile",
    )
    bio = models.TextField(
        blank=True,
        null=True,
        help_text="Short description or about section for the store",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.store_name
class StoreCategory(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    dp_image = models.ImageField(upload_to="categories/dp/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("store", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.store.store_name})"


class StoreSubCategory(models.Model):
    category = models.ForeignKey(StoreCategory, on_delete=models.CASCADE, related_name="subcategories")
    name = models.CharField(max_length=100)
    dp_image = models.ImageField(upload_to="subcategories/dp/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("category", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.category.name} → {self.name}"

class OfferCategory(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="offer_categories")
    title = models.CharField(max_length=150)

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    banner_image = models.ImageField(upload_to="offers/banners/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_active(self):
        now = timezone.now()
        return self.start_date <= now <= self.end_date

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.title} ({self.store.store_name})"


class Product(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="products")

    # New category fields
    store_category = models.ForeignKey(
        StoreCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products"
    )

    store_subcategory = models.ForeignKey(
        StoreSubCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products"
    )

    offer_category = models.ForeignKey(
        OfferCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        help_text="If selected, product will show under this active offer category."
    )

    # Existing fields
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    main_image = models.ImageField(upload_to="products/main/", blank=True, null=True)

    keywords = models.CharField(
        max_length=250,
        blank=True,
        help_text="Comma-separated keywords for search"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.store.store_name})"

    def clean(self):
        # Prevent category mismatches
        if self.store_subcategory and self.store_subcategory.category.store != self.store:
            raise ValidationError("Subcategory does not belong to this store.")
        if self.store_category and self.store_category.store != self.store:
            raise ValidationError("Category does not belong to this store.")
        if self.offer_category and self.offer_category.store != self.store:
            raise ValidationError("Offer category does not belong to this store.")


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/gallery/")

    def __str__(self):
        return f"Image of {self.product.name}"


class ProductSize(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="sizes")
    size_label = models.CharField(max_length=20)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} - {self.size_label}"


class Reservation(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reservations")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reservations")
    size = models.ForeignKey(ProductSize, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    advance_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=RESERVATION_STATUS, default="reserved")
    unique_code = models.CharField(max_length=6, unique=True, editable=False)
    reserved_until = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    store = models.ForeignKey("Store", on_delete=models.CASCADE, related_name="reservations", null=True, blank=True)

    # ⭐ ADD THESE FIELDS ⭐
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_phone = models.CharField(max_length=20, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = str(uuid.uuid4().int)[:4]
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.reserved_until

    def __str__(self):
        return f"Reservation {self.unique_code} - {self.customer.username}"


from django.db import models
from decimal import Decimal
from django.conf import settings
from django.utils import timezone


def generate_invoice_no():
    today = timezone.now().strftime("%Y%m%d")
    last_sale = Sale.objects.filter(
        invoice_no__startswith=f"INV-{today}"
    ).order_by("-id").first()

    if last_sale and last_sale.invoice_no:
        try:
            last_seq = int(last_sale.invoice_no.split("-")[-1])
        except ValueError:
            last_seq = 0
    else:
        last_seq = 0

    new_seq = str(last_seq + 1).zfill(3)
    return f"INV-{today}-{new_seq}"


class Sale(models.Model):
    store = models.ForeignKey("Store", on_delete=models.CASCADE, related_name="sales")
    products = models.JSONField()  # list of items: {id, sizes:[{size_label, price,...}], quantity}
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    invoice_no = models.CharField(max_length=128, blank=True, null=True, unique=True)
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_phone = models.CharField(max_length=32, blank=True, null=True)
    payment = models.JSONField(blank=True, null=True)  # {mode, paid_amount, credit_amount}
    is_credit = models.BooleanField(default=False)
    credit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reservation = models.ForeignKey("Reservation", on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.invoice_no:
            self.invoice_no = generate_invoice_no()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sale #{self.id} - {self.store.store_name} - ₹{self.total_amount}"

    class Meta:
        ordering = ["-created_at"]


class CustomerCredit(models.Model):
    store = models.ForeignKey("Store", on_delete=models.CASCADE, related_name="credits")
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_phone = models.CharField(max_length=32, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reference_sale = models.ForeignKey(Sale, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Credit ₹{self.amount} for {self.customer_phone or self.customer_name}"


class Return(models.Model):
    store = models.ForeignKey("Store", on_delete=models.CASCADE, related_name="returns")
    sale_item = models.JSONField()  # {product_id, size_label, quantity, unit_price}
    reason = models.TextField(blank=True, null=True)
    invoice_no = models.CharField(max_length=128, blank=True, null=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Return #{self.id} - {self.store.store_name}"

# ===============================
# ✅ ADVERTISEMENT MODEL
# ===============================
from django.db import models
from django.core.exceptions import ValidationError


class Advertisement(models.Model):
    MEDIA_CHOICES = [
        ("image", "Image"),
        ("video", "Video"),
    ]

    TEXT_POSITION_CHOICES = [
        ("left", "Left"),
        ("center", "Center"),
        ("right", "Right"),
    ]

    OVERLAY_STYLE_CHOICES = [
        ("light", "Light – Soft white overlay for bright visuals"),
        ("dark", "Dark – Subtle black overlay for luxury contrast"),
        ("golden", "Golden – Warm amber tone for premium or festive themes"),
        ("rose", "Rose – Gentle pink tint for lifestyle or fashion"),
        ("aqua", "Aqua – Modern blue-green tint for tech or freshness"),
        ("smoke", "Smoke – Muted gray haze for cinematic effect"),
        ("midnight", "Midnight – Deep navy overlay for premium night themes"),
        ("emerald", "Emerald – Rich green overlay for organic or nature-inspired content"),
    ]

    title = models.CharField(max_length=100, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to="ads/images/", blank=True, null=True)
    video = models.FileField(upload_to="ads/videos/", blank=True, null=True)
    link = models.URLField(blank=True, null=True)
    media_type = models.CharField(max_length=10, choices=MEDIA_CHOICES, default="image")
    active = models.BooleanField(default=True)
    text_position = models.CharField(
        max_length=10, choices=TEXT_POSITION_CHOICES, default="center"
    )
    overlay_style = models.CharField(
        max_length=10, choices=OVERLAY_STYLE_CHOICES, default="dark"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or "Advertisement"

    def clean(self):
        if self.media_type == "image" and not self.image:
            raise ValidationError("Please upload an image for image-type ads.")
        if self.media_type == "video" and not self.video:
            raise ValidationError("Please upload a video for video-type ads.")
        if self.image and self.video:
            raise ValidationError("You can upload only one — either an image or a video.")

# attendance/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

User = settings.AUTH_USER_MODEL

class Staff(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="staff_members")
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True, null=True)
    position = models.CharField(max_length=120, blank=True, null=True)
    salary_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # currency
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('owner', 'name')  # small guard; adjust as needed
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.position})"

class Attendance(models.Model):
    STATUS_FULL = 'FULL'
    STATUS_HALF = 'HALF'
    STATUS_ABSENT = 'ABSENT'
    STATUS_CHOICES = (
        (STATUS_FULL, 'Full Day'),
        (STATUS_HALF, 'Half Day'),
        (STATUS_ABSENT, 'Absent'),
    )

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendances")
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField()  # date of attendance
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    notes = models.TextField(blank=True, null=True)
    override_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                          help_text="If set, this amount will be used instead of computed salary")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('staff', 'date')
        ordering = ['-date']
    
    def compute_amount(self):
        """Return Decimal salary amount for this attendance row."""
        if self.override_amount is not None:
            return self.override_amount
        daily = self.staff.salary_per_day or Decimal('0.00')
        if self.status == self.STATUS_FULL:
            return daily
        if self.status == self.STATUS_HALF:
            # half day exactly half
            return (daily / Decimal('2'))
        return Decimal('0.00')

    def __str__(self):
        return f"{self.staff.name} - {self.date} - {self.status}"

class SalaryRecord(models.Model):
    """
    Represents a checkout / payout record for a given staff for a month (year + month).
    """
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="salary_records")
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="salary_records")
    year = models.IntegerField()
    month = models.IntegerField()  # 1..12
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    computed_at = models.DateTimeField(auto_now_add=True)
    is_paid = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('staff', 'year', 'month')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.staff.name} - {self.month}/{self.year} - {self.total_amount}"

# core/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

User = settings.AUTH_USER_MODEL


class BuyNowOrder(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("delivered", "Delivered"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey("Product", on_delete=models.CASCADE, related_name="buy_now_orders")
    size = models.ForeignKey("ProductSize", on_delete=models.CASCADE)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="buy_now_orders")
    store = models.ForeignKey("Store", on_delete=models.CASCADE, related_name="buy_now_orders")

    customer_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    pincode = models.CharField(max_length=15)
    landmark = models.CharField(max_length=255, blank=True, null=True)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default="Kerala")
    country = models.CharField(max_length=100, default="India")

    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.customer_name} ({self.status})"
