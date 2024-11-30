// proveedores.js

// Ahora no es necesario configurar Firebase aquí, ya que se hace en db.js

// Variables globales
var proveedores = [];
var proveedorSeleccionado = null;

// -----------------------------
// Funciones para Proveedores
// -----------------------------

// Cargar proveedores desde Firebase
function cargarProveedores() {
    db.collection("proveedores").onSnapshot(function(querySnapshot) {
        proveedores = [];
        querySnapshot.forEach(function(doc) {
            proveedores.push({ id: doc.id, ...doc.data() });
        });
        mostrarProveedores();
    });
}

// Mostrar proveedores en la tabla
function mostrarProveedores() {
    var tbody = document.querySelector('#proveedoresTable tbody');
    if (tbody) {
        tbody.innerHTML = '';
        proveedores.forEach(function(proveedor) {
            var tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${proveedor.nombre}</td>
                <td>${proveedor.diasCredito}</td>
                <td>
                    <button onclick="editarProveedor('${proveedor.id}')">Editar</button>
                    <button onclick="eliminarProveedor('${proveedor.id}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Abrir modal para agregar proveedor
function abrirModalProveedor() {
    document.getElementById('proveedorModal').style.display = 'block';
    document.getElementById('modalTitleProveedor').textContent = 'Agregar Proveedor';
    document.getElementById('proveedorForm').reset();
    proveedorSeleccionado = null;
}

// Cerrar modal de proveedor
function cerrarModalProveedor() {
    document.getElementById('proveedorModal').style.display = 'none';
}

// Manejar formulario de proveedor (Agregar/Editar)
document.getElementById('proveedorForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var nombre = document.getElementById('nombreProveedor').value.trim();
    var diasCredito = parseInt(document.getElementById('diasCredito').value);

    if (proveedorSeleccionado) {
        // Actualizar proveedor
        db.collection("proveedores").doc(proveedorSeleccionado.id).update({
            nombre: nombre,
            diasCredito: diasCredito
        }).then(function() {
            Swal.fire('Éxito', 'Proveedor actualizado correctamente', 'success');
            cerrarModalProveedor();
        }).catch(function(error) {
            console.error('Error al actualizar proveedor:', error);
            Swal.fire('Error', 'Hubo un problema al actualizar el proveedor', 'error');
        });
    } else {
        // Agregar nuevo proveedor
        db.collection("proveedores").add({
            nombre: nombre,
            diasCredito: diasCredito
        }).then(function() {
            Swal.fire('Éxito', 'Proveedor agregado correctamente', 'success');
            cerrarModalProveedor();
        }).catch(function(error) {
            console.error('Error al agregar proveedor:', error);
            Swal.fire('Error', 'Hubo un problema al agregar el proveedor', 'error');
        });
    }
});

// Editar proveedor
function editarProveedor(id) {
    proveedorSeleccionado = proveedores.find(function(p) { return p.id === id; });
    if (proveedorSeleccionado) {
        document.getElementById('proveedorModal').style.display = 'block';
        document.getElementById('modalTitleProveedor').textContent = 'Editar Proveedor';
        document.getElementById('nombreProveedor').value = proveedorSeleccionado.nombre;
        document.getElementById('diasCredito').value = proveedorSeleccionado.diasCredito;
    }
}

// Eliminar proveedor
function eliminarProveedor(id) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción eliminará el proveedor y todas las facturas asociadas.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection("proveedores").doc(id).delete().then(function() {
                Swal.fire('Eliminado', 'El proveedor ha sido eliminado', 'success');
            }).catch(function(error) {
                console.error('Error al eliminar proveedor:', error);
                Swal.fire('Error', 'Hubo un problema al eliminar el proveedor', 'error');
            });
        }
    });
}

// Inicialización
window.onload = function() {
    cargarProveedores();
};
