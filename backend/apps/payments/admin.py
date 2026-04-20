from django.contrib import admin
from .models import Payment, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "end_date", "is_active_display", "created_at", "updated_at")
    list_filter = ("end_date",)
    search_fields = ("user__email", "user__nom", "user__prenom")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("end_date",)

    @admin.display(boolean=True, description="Actif ?")
    def is_active_display(self, obj):
        return obj.is_active()


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "medecin", "montant_total", "commission", "honoraires_medecin", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("medecin__email",)
    readonly_fields = ("created_at", "paid_at")
