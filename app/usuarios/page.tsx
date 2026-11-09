"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Plus, X, Loader2 } from "lucide-react";
import { gestionarUsuario, obtenerUsuarios, eliminarUsuarioAction } from "@/features/usuarios";

type TipoUsuario = "ADMIN" | "EDITOR" | "VIEWER";

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: "activo" | "inactivo";
  fechaRegistro: string;
}

const TIPOS_USUARIO: TipoUsuario[] = ["ADMIN", "EDITOR", "VIEWER"];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({ nombre: "", correo: "", tipoUsuario: "VIEWER" as TipoUsuario, estado: "activo" as "activo" | "inactivo", password: "" });
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const load = async () => {
      setCargando(true);
      try {
        const data = await obtenerUsuarios();
        setUsuarios(data as unknown as Usuario[]);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    load();
  }, []);

  const usuariosFiltrados = usuarios.filter((usuario) =>
    usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    usuario.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
    usuario.tipoUsuario.toLowerCase().includes(busqueda.toLowerCase())
  );

  const validarFormulario = (): string | null => {
    if (!formData.nombre.trim()) return "El nombre es requerido";
    if (!formData.correo.trim()) return "El correo es requerido";
    if (modalMode === "create" && !formData.password.trim()) return "La contraseña es requerida";
    if (modalMode === "create" && formData.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    return null;
  };

  const abrirModalCrear = () => {
    setModalMode("create");
    setUsuarioEditando(null);
    setFormData({ nombre: "", correo: "", tipoUsuario: "VIEWER", estado: "activo", password: "" });
    setMostrarModal(true);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    setModalMode("edit");
    setUsuarioEditando(usuario);
    setFormData({ nombre: usuario.nombre, correo: usuario.correo, tipoUsuario: usuario.tipoUsuario, estado: usuario.estado, password: "" });
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

  const handleGuardarUsuario = async () => {
    const errorMsg = validarFormulario();
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    setProcesando(true);
    try {
      const res = await gestionarUsuario(
        formData, 
        modalMode === "edit" ? usuarioEditando?.id : undefined
      );

      if (res.success) {
        // Recargar la lista completa para asegurar sincronía con la DB
        const data = await obtenerUsuarios();
        setUsuarios(data as unknown as Usuario[]);
        cerrarModal();
      } else {
        alert(res.error || "Error al procesar la solicitud");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarUsuario = async (id: number) => {
    if (window.confirm("¿Está seguro de que desea eliminar este usuario definitivamente?")) {
      try {
        const res = await eliminarUsuarioAction(id);
        if (res.success) {
          setUsuarios(usuarios.filter((usuario) => usuario.id !== id));
        } else {
          alert(res.error || "No se pudo eliminar el usuario");
        }
      } catch (error) {
        alert("Error al intentar eliminar");
      }
    }
  };

  const getColorTipoUsuario = (tipo: TipoUsuario) => {
    switch (tipo) {
      case "ADMIN": return "bg-red-50 text-red-700 border border-red-200";
      case "EDITOR": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "VIEWER": return "bg-gray-50 text-gray-700 border border-gray-200";
      default: return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getColorEstado = (estado: "activo" | "inactivo") => {
    return estado === "activo"
      ? "bg-green-50 text-green-700 border border-green-200"
      : "bg-yellow-50 text-yellow-700 border border-yellow-200";
  };

  return (
    <div>
      <div>
        <div className="clp-page-head">
          <h1 className="clp-page-title">Gestión de Usuarios</h1>
          <p className="clp-page-sub mt-0.5 text-sm">Usuarios de Clapsa Net</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="clp-input md:flex-1"
          />
          <button
            onClick={abrirModalCrear}
            className="clp-btn clp-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        <div className="clp-card overflow-hidden">
          <div className="clp-panel-head">
            <p className="text-sm text-slate-600">
              Total de usuarios registrados: <strong>{usuarios.length}</strong>
            </p>
          </div>
          <table className="clp-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="clp-table-vacia">
                    {usuarios.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios'}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="font-medium">{usuario.nombre}</td>
                    <td>{usuario.correo}</td>
                    <td>
                      <span className={`clp-badge ${getColorTipoUsuario(usuario.tipoUsuario)}`}>
                        {usuario.tipoUsuario}
                      </span>
                    </td>
                    <td>
                      <span className={`clp-badge ${getColorEstado(usuario.estado)}`}>
                        {usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(usuario)}
                          className="clp-icon-btn"
                          title="Editar usuario"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarUsuario(usuario.id)}
                          className="clp-icon-btn clp-icon-btn-danger"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {mostrarModal && (
          <div className="clp-modal-scrim">
            <div className="clp-modal">
              <div className="clp-modal-head">
                <h2 className="clp-modal-title">{modalMode === "create" ? "Nuevo Usuario" : "Editar Usuario"}</h2>
                <button onClick={cerrarModal} className="clp-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="clp-label">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre completo"
                    className="clp-input"
                  />
                </div>
                <div>
                  <label className="clp-label">Correo</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="usuario@empresa.com"
                    className="clp-input"
                  />
                </div>
                {modalMode === "create" && (
                  <div>
                    <label className="clp-label">Contraseña</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="clp-input"
                    />
                    <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                  </div>
                )}
                <div>
                  <label className="clp-label">Tipo de Usuario</label>
                  <select
                    value={formData.tipoUsuario}
                    onChange={(e) => setFormData({ ...formData, tipoUsuario: e.target.value as TipoUsuario })}
                    className="clp-input"
                  >
                    {TIPOS_USUARIO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="clp-label">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as "activo" | "inactivo" })}
                    className="clp-input"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-linea px-6 pb-6">
                <button
                  onClick={cerrarModal}
                  className="clp-btn clp-btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarUsuario}
                  disabled={procesando}
                  className="clp-btn clp-btn-primary flex-1"
                >
                  {procesando ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
                  {procesando ? "Guardando..." : (modalMode === "create" ? "Registrar" : "Actualizar")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}