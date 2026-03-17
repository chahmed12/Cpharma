from django.contrib            import admin
from django.contrib.auth.admin import UserAdmin
from .models                   import CustomUser, DoctorProfile, PharmacistProfile


class DoctorProfileInline(admin.StackedInline):
    model = DoctorProfile
    extra = 0


class PharmacistProfileInline(admin.StackedInline):
    model = PharmacistProfile
    extra = 0


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display   = ['email', 'nom', 'prenom', 'role', 'is_active', 'is_staff']
    list_filter    = ['role', 'is_active', 'is_staff']
    search_fields  = ['email', 'nom', 'prenom']
    ordering       = ['email']

    # ← Remplacer username par email partout
    fieldsets = (
        (None,           {'fields': ('email', 'password')}),
        ('Informations', {'fields': ('nom', 'prenom', 'role')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates',        {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields':  ('email', 'nom', 'prenom', 'role', 'password1', 'password2'),
        }),
    )

    def get_inlines(self, request, obj=None):
        if obj is None:
            return []
        if obj.role == 'MEDECIN':
            return [DoctorProfileInline]
        if obj.role == 'PHARMACIEN':
            return [PharmacistProfileInline]
        return []


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'specialite', 'status', 'tarif_consultation']
    list_filter   = ['status']
    list_editable = ['status']
    search_fields = ['user__nom', 'user__email']


@admin.register(PharmacistProfile)
class PharmacistProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'nom_pharmacie']
    search_fields = ['user__nom', 'nom_pharmacie']