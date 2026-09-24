export type UserRole = 'client' | 'staff' | 'admin'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed'
export type PaymentProvider = 'stripe' | 'mercadopago' | 'manual'
export type PaymentKind = 'appointment' | 'package'
export type PurchaseStatus = 'pending' | 'active' | 'used' | 'expired' | 'cancelled'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: UserRole
  notes: string | null
  created_at: string
}

export interface Location {
  id: string
  name: string
  slug: string
  address: string | null
  city: string | null
  phone: string | null
  timezone: string
  map_url: string | null
  is_active: boolean
  sort_order: number
}

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
}

export interface Service {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price_amount: number
  duration_min: number
  buffer_min: number
  deposit_amount: number
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

export interface Staff {
  id: string
  profile_id: string | null
  display_name: string
  title: string | null
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  sort_order: number
}

export interface Package {
  id: string
  name: string
  slug: string
  description: string | null
  price_amount: number
  sessions_count: number
  validity_days: number | null
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

export interface PackagePurchase {
  id: string
  client_id: string
  package_id: string
  package_name: string
  price_amount: number
  sessions_total: number
  sessions_used: number
  status: PurchaseStatus
  purchased_at: string
  expires_at: string | null
}

export interface Appointment {
  id: string
  client_id: string | null
  staff_id: string
  service_id: string
  location_id: string
  starts_at: string
  ends_at: string
  blocked_until: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  price_amount: number
  purchase_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  client_notes: string | null
  staff_notes: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
}

export interface Payment {
  id: string
  client_id: string | null
  kind: PaymentKind
  appointment_id: string | null
  purchase_id: string | null
  provider: PaymentProvider
  provider_ref: string | null
  amount: number
  currency: string
  status: PaymentStatus
  created_at: string
}

// ---------- ajustes editables desde /admin ----------

export interface BusinessSettings {
  name: string
  tagline: string
  email: string
  phone: string
  instagram: string
  whatsapp: string
  currency: string
  timezone: string
}

export interface BookingSettings {
  slot_interval_min: number
  min_lead_hours: number
  max_advance_days: number
  cancel_window_hours: number
  require_account: boolean
  auto_confirm: boolean
}

export interface HomeValue {
  title: string
  body: string
}

export interface HomeSettings {
  hero_title: string
  hero_subtitle: string
  hero_cta: string
  about_title: string
  about_body: string
  values: HomeValue[]
}

export const DEFAULT_BUSINESS: BusinessSettings = {
  name: 'Carezia',
  tagline: 'Estética consciente',
  email: 'hola@carezia.cl',
  phone: '',
  instagram: 'carezia.cl',
  whatsapp: '',
  currency: 'CLP',
  timezone: 'America/Santiago',
}

export const DEFAULT_BOOKING: BookingSettings = {
  slot_interval_min: 15,
  min_lead_hours: 2,
  max_advance_days: 60,
  cancel_window_hours: 24,
  require_account: false,
  auto_confirm: true,
}

export const DEFAULT_HOME: HomeSettings = {
  hero_title: 'Tu piel, con tiempo y criterio',
  hero_subtitle:
    'Tratamientos faciales y corporales diseñados uno a uno. Sin apuro, sin promesas imposibles.',
  hero_cta: 'Reservar hora',
  about_title: 'Qué hacemos distinto',
  about_body:
    'Cada sesión parte con una evaluación real de tu piel. Trabajamos con protocolos progresivos y un plan que se ajusta contigo.',
  values: [],
}

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Por confirmar',
  confirmed: 'Confirmada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Pendiente de pago',
  pending: 'Pago en proceso',
  paid: 'Pagada',
  refunded: 'Reembolsada',
  failed: 'Pago fallido',
}

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  pending: 'Pago pendiente',
  active: 'Activo',
  used: 'Sesiones agotadas',
  expired: 'Vencido',
  cancelled: 'Anulado',
}

export const WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const
