"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesionAction } from "@/app/lib/actions/usuarios";
import { useSession } from "@/app/components/session/SessionProvider";

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
  const { setSessionUser } = useSession();
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
      return {
        general: "Usuario incorrecto",
        correo: "Usuario incorrecto",
        password: "",
      };
    }

    if (!form.password.trim()) {
      return {
        general: "Contraseña incorrecta",
        correo: "",
        password: "Contraseña incorrecta",
      };
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
        const errorMessage = response.error || "Ocurrió un error inesperado";
        setErrors({
          general: errorMessage,
          correo: errorMessage === "Usuario no encontrado" ? errorMessage : "",
          password: errorMessage === "Contraseña incorrecta" ? errorMessage : "",
        });
        return false;
      }

      const loginDate = new Date().toISOString();
      setSessionUser({
        ...response.usuario,
        fechaIngreso: loginDate,
      });

      setForm(INITIAL_FORM);
      router.push("/");
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