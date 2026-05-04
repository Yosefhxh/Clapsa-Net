"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Pencil, Plus, X } from "lucide-react";

type TipoUsuario = "ADMIN" | "EDITOR" | "VIEWER";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: "activo" | "inactivo";
  fechaRegistro: string;
}

const STORAGE_KEY = "clapsa-usuarios";
const TIPOS_USUARIO: TipoUsuario[] = ["ADMIN", "EDITOR", "VIEWER"];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    tipoUsuario: "VIEWER" as TipoUsuario,
    estado: "activo" as "activo" | "inactivo",
    password: "",
  });

  // Cargar usuarios del localStorage al iniciar
  useEffect(() => {
    const storedUsuarios = localStorage.getItem(STORAGE_KEY);
    if (storedUsuarios) {
      try {
        setUsuarios(JSON.parse(storedUsuarios));
      } catch {
        console.error("Error al cargar usuarios");
      }
    }
  }, []);

  // Guardar usuarios en localStorage cada vez que cambien
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
  }, [usuarios]);

  const usuariosFiltrados = usuarios.filter((usuario) =>
    usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    usuario.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
    usuario.tipoUsuario.includes(busqueda.toUpperCase())
  );

  const validarFormulario = (): string | null => {
    if (!formData.nombre.trim()) return "El nombre es requerido";
    if (!formData.correo.trim()) return "El correo es requerido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) return "Correo inválido";
    if (modalMode === "create" && !formData.password.trim()) return "La contraseña es requerida";
    if (modalMode === "create" && formData.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    return null;
  };

  const abrirModalCrear = () => {
    setModalMode("create");
    setUsuarioEditando(null);
    setFormData({
      nombre: "",
      correo: "",
      tipoUsuario: "VIEWER",
      estado: "activo",
      password: "",
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    setModalMode("edit");
    setUsuarioEditando(usuario);
    setFormData({
      nombre: usuario.nombre,
      correo: usuario.correo,
      tipoUsuario: usuario.tipoUsuario,
      estado: usuario.estado,
      password: "",
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setFormData({
      nombre: "",
      correo: "",
      tipoUsuario: "VIEWER",
      estado: "activo",
      password: "",
    });
  };

  const handleGuardarUsuario = () => {
    const error = validarFormulario();
    if (error) {
      alert(error);
      return;
    }

    if (modalMode === "create") {
      const nuevoUsuario: Usuario = {
        id: `usuario-${Date.now()}`,
        nombre: formData.nombre,
        correo: formData.correo,
        tipoUsuario: formData.tipoUsuario,
        estado: formData.estado,
        fechaRegistro: new Date().toLocaleString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setUsuarios([...usuarios, nuevoUsuario]);
    } else if (modalMode === "edit" && usuarioEditando) {
      setUsuarios(
        usuarios.map((usuario) =>
          usuario.id === usuarioEditando.id
            ? {
                ...usuario,
                nombre: formData.nombre,
                correo: formData.correo,
                tipoUsuario: formData.tipoUsuario,
                estado: formData.estado,
              }
            : usuario
        )
      );
    }

    cerrarModal();
  };

  const handleEliminarUsuario = (id: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar este usuario?")) {
      setUsuarios(usuarios.filter((usuario) => usuario.id !== id));
    }
  };

  const getColorTipoUsuario = (tipo: TipoUsuario) => {
    switch (tipo) {
      case "ADMIN":
        return "bg-red-50 text-red-700 border border-red-200";
      case "EDITOR":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "VIEWER":
        return "bg-gray-50 text-gray-700 border border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getColorEstado = (estado: "activo" | "inactivo") => {
    return estado === "activo"
      ? "bg-green-50 text-green-700 border border-green-200"
      : "bg-yellow-50 text-yellow-700 border border-yellow-200";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios del sistema</p>
        </div>

        {/* Barra de búsqueda y botón */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre, correo o tipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20 focus:border-transparent"
          />
          <button
            onClick={abrirModalCrear}
            className="flex items-center gap-2 px-6 py-2 bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 rounded-lg hover:bg-aduanaBlue/20 transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Nuevo Usuario
          </button>
        </div>

        {/* Tabla de usuarios */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-lg">
                {usuarios.length === 0
                  ? "No hay usuarios registrados"
                  : "No se encontraron usuarios"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nombre</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Correo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha Registro</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {usuario.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {usuario.correo}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getColorTipoUsuario(
                            usuario.tipoUsuario
                          )}`}
                        >
                          {usuario.tipoUsuario}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getColorEstado(
                            usuario.estado
                          )}`}
                        >
                          {usuario.estado === "activo" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {usuario.fechaRegistro}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => abrirModalEditar(usuario)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar usuario"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarUsuario(usuario.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === "create" ? "Nuevo Usuario" : "Editar Usuario"}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Nombre del usuario"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) =>
                      setFormData({ ...formData, correo: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                {modalMode === "create" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuario
                  </label>
                  <select
                    value={formData.tipoUsuario}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoUsuario: e.target.value as TipoUsuario,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  >
                    {TIPOS_USUARIO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estado: e.target.value as "activo" | "inactivo",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarUsuario}
                  className="flex-1 px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-all font-medium"
                >
                  {modalMode === "create" ? "Registrar" : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
