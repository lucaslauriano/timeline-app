"use client"

import { useState } from "react"
import { Calendar } from "@/components/calendar"
import { AppointmentForm } from "@/components/appointment-form"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import type { Appointment } from "@/lib/types"

export default function GanttCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  const handleAddAppointment = (appointment: Appointment) => {
    if (editingAppointment) {
      setAppointments(appointments.map((app) => (app.id === editingAppointment.id ? appointment : app)))
      setEditingAppointment(null)
    } else {
      setAppointments([...appointments, { ...appointment, id: Date.now().toString() }])
    }
    setIsFormOpen(false)
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setIsFormOpen(true)
  }

  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter((app) => app.id !== id))
  }

  const handleUpdateAppointment = (updatedAppointment: Appointment) => {
    setAppointments(appointments.map((app) => (app.id === updatedAppointment.id ? updatedAppointment : app)))
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Calendário Gantt</h1>
        <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Novo Compromisso
        </Button>
      </div>

      <Calendar
        appointments={appointments}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
        onUpdate={handleUpdateAppointment}
      />

      {isFormOpen && (
        <AppointmentForm
          onSubmit={handleAddAppointment}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingAppointment(null)
          }}
          initialData={editingAppointment}
        />
      )}
    </div>
  )
}
