"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesionAction } from "@/features/usuarios";

interface LoginFormState {
  correo: string;
  password: string;
}

interface LoginErrors {
  general: string;
  correo: string;
  password: string;
}

const INITIAL_FORM: LoginFormState = {
  correo: "",
  password: "",
};

const INITIAL_ERRORS: LoginErrors = {
  general: "",
  correo: "",
  password: "",
};

export function useLogin() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<LoginErrors>(INITIAL_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof LoginFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors(INITIAL_ERRORS);
  };

  const validarFormulario = () => {
    if (!form.correo.trim() || !form.correo.includes("@")) {
      return { general: "", correo: "Escribe un correo válido", password: "" };
    }

    if (!form.password) {
      return { general: "", correo: "", password: "Escribe tu contraseña" };
    }

    return null;
  };

  const submitLogin = async () => {
    const validationError = validarFormulario();

    if (validationError) {
      setErrors(validationError);
      return false;
    }

    setIsSubmitting(true);

    try {
      const response = await iniciarSesionAction(form.correo, form.password);

      if (!response.success) {
        setErrors({ general: response.error || "Ocurrió un error inesperado", correo: "", password: "" });
        return false;
      }

      setForm(INITIAL_FORM);
      router.replace("/");
      router.refresh();
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    errors,
    isSubmitting,
    updateField,
    submitLogin,
  };
}