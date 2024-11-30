// empresas.js

// Variables globales
var empresas = [];
var empresaSeleccionada = null;

// -----------------------------
// Funciones para Empresas y Sucursales
// -----------------------------

// Cargar empresas desde Firebase
function cargarEmpresas() {
    db.collection("empresas").onSnapshot(function(querySnapshot) {
        empresas = [];
        querySnapshot.forEach(function(doc) {
            empresas.push({ id: doc.id, ...doc.data() });
        });
        mostrarEmpresas();
    });
}

// Mostrar empresas en la tabla
function mostrarEmpresas() {
    var tbody = document.querySelector('#empresasTable tbody');
    if (tbody) {
        tbody.innerHTML = '';
        empresas.forEach(function(empresa) {
            var sucursalesHtml = '';
            if (empresa.sucursales && empresa.sucursales.length > 0) {
                sucursalesHtml = empresa.sucursales.map(function(sucursal, index) {
                    return `<li>${sucursal} <button onclick="eliminarSucursal('${empresa.id}', ${index})">Eliminar</button></li>`;
                }).join('');
            } else {
                sucursalesHtml = '<li>No tiene sucursales</li>';
            }
            var tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${empresa.nombre}</td>
                <td><ul>${sucursalesHtml}</ul></td>
                <td>
                    <button onclick="editarEmpresa('${empresa.id}')">Editar</button>
                    <button onclick="eliminarEmpresa('${empresa.id}')">Eliminar</button>
                    <button onclick="abrirModalSucursal('${empresa.id}')">Agregar Sucursal</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Abrir modal para agregar empresa
function abrirModalEmpresa() {
    document.getElementById('empresaModal').style.display = 'block';
    document.getElementById('modalTitleEmpresa').textContent = 'Agregar Empresa';
    document.getElementById('empresaForm').reset();
    empresaSeleccionada = null;
}

// Cerrar modal de empresa
function cerrarModalEmpresa() {
    document.getElementById('empresaModal').style.display = 'none';
}

// Manejar formulario de empresa (Agregar/Editar)
document.getElementById('empresaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var nombre = document.getElementById('nombreEmpresa').value.trim();

    if (empresaSeleccionada) {
        // Actualizar empresa
        db.collection("empresas").doc(empresaSeleccionada.id).update({
            nombre: nombre
        }).then(function() {
            Swal.fire('Éxito', 'Empresa actualizada correctamente', 'success');
            cerrarModalEmpresa();
        }).catch(function(error) {
            console.error('Error al actualizar empresa:', error);
            Swal.fire('Error', 'Hubo un problema al actualizar la empresa', 'error');
        });
    } else {
        // Agregar nueva empresa
        db.collection("empresas").add({
            nombre: nombre,
            sucursales: []
        }).then(function() {
            Swal.fire('Éxito', 'Empresa agregada correctamente', 'success');
            cerrarModalEmpresa();
        }).catch(function(error) {
            console.error('Error al agregar empresa:', error);
            Swal.fire('Error', 'Hubo un problema al agregar la empresa', 'error');
        });
    }
});

// Editar empresa
function editarEmpresa(id) {
    empresaSeleccionada = empresas.find(function(e) { return e.id === id; });
    if (empresaSeleccionada) {
        document.getElementById('empresaModal').style.display = 'block';
        document.getElementById('modalTitleEmpresa').textContent = 'Editar Empresa';
        document.getElementById('nombreEmpresa').value = empresaSeleccionada.nombre;
    }
}

// Eliminar empresa
function eliminarEmpresa(id) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción eliminará la empresa y todas sus sucursales.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection("empresas").doc(id).delete().then(function() {
                Swal.fire('Eliminado', 'La empresa ha sido eliminada', 'success');
            }).catch(function(error) {
                console.error('Error al eliminar empresa:', error);
                Swal.fire('Error', 'Hubo un problema al eliminar la empresa', 'error');
            });
        }
    });
}

// Abrir modal para agregar sucursal
function abrirModalSucursal(empresaId) {
    empresaSeleccionada = empresas.find(function(e) { return e.id === empresaId; });
    if (empresaSeleccionada) {
        document.getElementById('sucursalModal').style.display = 'block';
        document.getElementById('modalTitleSucursal').textContent = 'Agregar Sucursal a ' + empresaSeleccionada.nombre;
        document.getElementById('sucursalForm').reset();
    }
}

// Cerrar modal de sucursal
function cerrarModalSucursal() {
    document.getElementById('sucursalModal').style.display = 'none';
}

// Manejar formulario de sucursal (Agregar)
document.getElementById('sucursalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var nombreSucursal = document.getElementById('nombreSucursal').value.trim();

    if (empresaSeleccionada) {
        var nuevasSucursales = empresaSeleccionada.sucursales || [];
        nuevasSucursales.push(nombreSucursal);
        db.collection("empresas").doc(empresaSeleccionada.id).update({
            sucursales: nuevasSucursales
        }).then(function() {
            Swal.fire('Éxito', 'Sucursal agregada correctamente', 'success');
            cerrarModalSucursal();
        }).catch(function(error) {
            console.error('Error al agregar sucursal:', error);
            Swal.fire('Error', 'Hubo un problema al agregar la sucursal', 'error');
        });
    }
});

// Eliminar sucursal
function eliminarSucursal(empresaId, sucursalIndex) {
    var empresa = empresas.find(function(e) { return e.id === empresaId; });
    if (empresa) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción eliminará la sucursal seleccionada.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                empresa.sucursales.splice(sucursalIndex, 1);
                db.collection("empresas").doc(empresaId).update({
                    sucursales: empresa.sucursales
                }).then(function() {
                    Swal.fire('Eliminado', 'La sucursal ha sido eliminada', 'success');
                }).catch(function(error) {
                    console.error('Error al eliminar sucursal:', error);
                    Swal.fire('Error', 'Hubo un problema al eliminar la sucursal', 'error');
                });
            }
        });
    }
}

// Inicialización
window.onload = function() {
    cargarEmpresas();
};
