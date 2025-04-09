"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import type { Appointment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface AppointmentFormProps {
  onSubmit: (appointment: Appointment) => void
  onCancel: () => void
  initialData: Appointment | null
}

export function AppointmentForm({ onSubmit, onCancel, initialData }: AppointmentFormProps) {
  const [formData, setFormData] = useState<Omit<Appointment, "id">>({
    title: "",
    description: "",
    startTime: format(new Date().setHours(9, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    endTime: format(new Date().setHours(10, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    color: "#3b82f6",
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        startTime: format(new Date(initialData.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(initialData.endTime), "yyyy-MM-dd'T'HH:mm"),
        color: initialData.color,
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...(initialData || { id: "" }),
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
    })
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Compromisso" : "Novo Compromisso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Início</Label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Fim</Label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                name="color"
                type="color"
                value={formData.color}
                onChange={handleChange}
                className="w-12 h-8 p-1"
              />
              <span className="text-sm text-muted-foreground">{formData.color}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">{initialData ? "Atualizar" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
