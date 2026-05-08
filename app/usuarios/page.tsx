"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Plus, X, Loader2 } from "lucide-react";
import { gestionarUsuario, obtenerUsuarios, eliminarUsuarioAction } from "@/app/lib/actions/usuarios";

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
          <p className="text-gray-600">Persistencia directa en base de datos</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
          />
          <button
            onClick={abrirModalCrear}
            className="flex items-center gap-2 px-4 py-2 bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 rounded-lg hover:bg-aduanaBlue/15 hover:border-aduanaBlue/30 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-sm text-slate-600">
              Total de usuarios registrados: <strong>{usuarios.length}</strong>
            </p>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nombre</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Correo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    {usuarios.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios'}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-700 text-sm font-medium">{usuario.nombre}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{usuario.correo}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getColorTipoUsuario(usuario.tipoUsuario)}`}>
                        {usuario.tipoUsuario}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getColorEstado(usuario.estado)}`}>
                        {usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(usuario)}
                          className="p-2 text-slate-400 hover:text-aduanaBlue transition-colors"
                          title="Editar usuario"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarUsuario(usuario.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                <h2 className="text-xl font-bold text-slate-800">{modalMode === "create" ? "Nuevo Usuario" : "Editar Usuario"}</h2>
                <button onClick={cerrarModal} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre completo"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Correo</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>
                {modalMode === "create" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Contraseña</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                    />
                    <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Tipo de Usuario</label>
                  <select
                    value={formData.tipoUsuario}
                    onChange={(e) => setFormData({ ...formData, tipoUsuario: e.target.value as TipoUsuario })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  >
                    {TIPOS_USUARIO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as "activo" | "inactivo" })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 px-6 pb-6">
                <button
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarUsuario}
                  disabled={procesando}
                  className="flex-1 px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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