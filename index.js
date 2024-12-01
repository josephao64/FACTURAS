// index.js

// Asegúrate de que db.js está correctamente configurado con tu proyecto de Firebase
// y que este archivo se carga antes de este script en tu HTML.
// const db = firebase.firestore();

// Variables Globales
let facturas = [];    // Lista de facturas
let pagos = [];       // Lista de pagos
let empresas = [];    // Lista de empresas
let proveedores = []; // Lista de proveedores

// Formatter para Quetzales
const quetzalFormatter = new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2
});

// Función para cargar datos iniciales
function cargarDatosIniciales() {
    cargarEmpresas();
    cargarProveedores();
    cargarFacturas();
    cargarPagos();
    poblarSelectEmpresaFilter();
    poblarSelectProveedorFilter();
    poblarSelectSucursalFilter();
    cargarAnios();
    agregarEventosGlobales();
}

// Función para cargar empresas desde Firestore
function cargarEmpresas() {
    db.collection("empresas").get()
        .then(querySnapshot => {
            empresas = []; // Reiniciar empresas
            querySnapshot.forEach(doc => {
                empresas.push({ id: doc.id, ...doc.data() });
            });
            poblarSelectEmpresas();
            poblarSelectEmpresaFilter();
            poblarSelectSucursalFilter(); // Actualizar sucursales después de cargar empresas
        })
        .catch(error => {
            console.error("Error al cargar empresas: ", error);
        });
}

// Función para cargar proveedores desde Firestore
function cargarProveedores() {
    db.collection("proveedores").get()
        .then(querySnapshot => {
            proveedores = []; // Reiniciar proveedores
            querySnapshot.forEach(doc => {
                proveedores.push({ id: doc.id, ...doc.data() });
            });
            poblarSelectProveedores();
            poblarSelectProveedorFilter();
        })
        .catch(error => {
            console.error("Error al cargar proveedores: ", error);
        });
}

// Función para cargar facturas desde Firestore con listener en tiempo real
function cargarFacturas() {
    db.collection("facturas").onSnapshot(snapshot => {
        facturas = [];
        snapshot.forEach(doc => {
            facturas.push({ id: doc.id, ...doc.data() });
        });
        filtrarFacturas(); // Aplicar filtros después de cargar
    }, error => {
        console.error("Error al cargar facturas: ", error);
    });
}

// Función para cargar pagos desde Firestore con listener en tiempo real
function cargarPagos() {
    db.collection("pagos").onSnapshot(snapshot => {
        pagos = [];
        snapshot.forEach(doc => {
            pagos.push({ id: doc.id, ...doc.data() });
        });
        // No se requiere refrescar la tabla de facturas aquí
    }, error => {
        console.error("Error al cargar pagos: ", error);
    });
}

// Función para poblar el select de empresas en los filtros
function poblarSelectEmpresaFilter() {
    const empresaFilter = document.getElementById('filterEmpresa');
    if (empresaFilter) {
        empresaFilter.innerHTML = '<option value="">Todas las Empresas</option>';
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nombre;
            empresaFilter.appendChild(option);
        });
    }
}

// Función para poblar el select de proveedores en los filtros
function poblarSelectProveedorFilter() {
    const proveedorFilter = document.getElementById('filterProveedor');
    if (proveedorFilter) {
        proveedorFilter.innerHTML = '<option value="">Todos los Proveedores</option>';
        proveedores.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor.id;
            option.textContent = proveedor.nombre;
            proveedorFilter.appendChild(option);
        });
    }
}

// Función para poblar el select de sucursales en los filtros
function poblarSelectSucursalFilter() {
    const sucursalFilter = document.getElementById('filterSucursal');
    if (sucursalFilter) {
        sucursalFilter.innerHTML = '<option value="">Todas las Sucursales</option>';
        // Obtener todas las sucursales únicas de las empresas
        const sucursalesUnicas = [...new Set(empresas.flatMap(e => e.sucursales))];
        sucursalesUnicas.forEach(sucursal => {
            const option = document.createElement('option');
            option.value = sucursal;
            option.textContent = sucursal;
            sucursalFilter.appendChild(option);
        });
    }
}

// Función para poblar el select de empresas en el modal de factura
function poblarSelectEmpresas() {
    const empresaSelect = document.getElementById('empresa');
    if (empresaSelect) {
        empresaSelect.innerHTML = '<option value="">Selecciona una empresa</option>';
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nombre;
            empresaSelect.appendChild(option);
        });
    }
}

// Función para poblar el select de proveedores en el modal de factura
function poblarSelectProveedores() {
    const proveedorSelect = document.getElementById('proveedor');
    if (proveedorSelect) {
        proveedorSelect.innerHTML = '<option value="">Selecciona un proveedor</option>';
        proveedores.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor.id;
            option.textContent = proveedor.nombre;
            proveedorSelect.appendChild(option);
        });
    }
}

// Función para poblar el select de sucursales en el modal de factura basado en la empresa seleccionada
function poblarSelectSucursalModal() {
    const empresaSelect = document.getElementById('empresa');
    const sucursalSelect = document.getElementById('sucursal');
    if (empresaSelect && sucursalSelect) {
        sucursalSelect.innerHTML = '<option value="">Selecciona una sucursal</option>';
        const empresaId = empresaSelect.value;
        if (empresaId) {
            const empresa = empresas.find(e => e.id === empresaId);
            if (empresa && empresa.sucursales) {
                empresa.sucursales.forEach(sucursal => {
                    const option = document.createElement('option');
                    option.value = sucursal;
                    option.textContent = sucursal;
                    sucursalSelect.appendChild(option);
                });
            }
        }
    }
}

// Función para cargar años en el select de año
function cargarAnios() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2000; y--) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }
}

// -----------------------------
// Funciones para Mostrar Facturas
// -----------------------------

// Función para mostrar facturas en la tabla
function mostrarFacturas(facturasFiltradas) {
    const tbody = document.querySelector('#facturasTable tbody');
    let totalFacturas = 0;
    let totalPagado = 0;

    if (tbody) {
        tbody.innerHTML = '';
        facturasFiltradas.forEach(factura => {
            const empresa = empresas.find(e => e.id === factura.empresaId);
            const proveedor = proveedores.find(p => p.id === factura.proveedorId);
            const montoPagado = calcularMontoPagadoSync(factura.id);

            totalFacturas += factura.montoFactura;
            totalPagado += montoPagado;

            // Obtener datos del último pago asociado a la factura
            const ultimoPago = obtenerUltimoPagoFactura(factura.id);
            const montoPagoAplicado = ultimoPago ? obtenerMontoPagoAplicado(factura.id, ultimoPago) : 0;

            const tr = document.createElement('tr');
            tr.setAttribute('data-id', factura.id);
            tr.innerHTML = `
                <td><input type="checkbox" class="select-factura" value="${factura.id}"></td>
                <td>${empresa ? empresa.nombre : 'Desconocida'}</td>
                <td>${proveedor ? proveedor.nombre : 'Desconocido'}</td>
                <td>${factura.sucursal}</td>
                <td>${factura.fechaFactura}</td>
                <td>${factura.numeroFactura}</td>
                <td>${quetzalFormatter.format(factura.montoFactura)}</td>
                <td>${factura.fechaVencimiento}</td>
                <td>${factura.estado}</td>
                <td>${ultimoPago ? ultimoPago.idBoleta : 'No tiene pagos aplicados'}</td>
                <td>${ultimoPago ? quetzalFormatter.format(montoPagoAplicado) : 'No tiene pagos aplicados'}</td>
                <td>${ultimoPago ? ultimoPago.fechaPago : 'No tiene pagos aplicados'}</td>
                <td>${quetzalFormatter.format(montoPagado)}</td>
            `;
            tbody.appendChild(tr);
        });
        // Actualizar totales en el pie de la tabla
        document.getElementById('totalFacturas').textContent = quetzalFormatter.format(totalFacturas);
        document.getElementById('totalPagado').textContent = quetzalFormatter.format(totalPagado);
    }
}

// Función para mostrar todas las facturas sin filtros
function mostrarTodasFacturas() {
    mostrarFacturas(facturas);
}

// -----------------------------
// Funciones para Filtros y Búsqueda
// -----------------------------

// Agregar eventos a los filtros personalizados
const filterOptions = document.getElementsByName('filterOption');
filterOptions.forEach(option => {
    option.addEventListener('change', filtrarFacturas);
});

// Agregar eventos a los filtros generales
document.getElementById('searchInput').addEventListener('input', filtrarFacturas);
document.getElementById('filterEmpresa').addEventListener('change', filtrarFacturas);
document.getElementById('filterProveedor').addEventListener('change', filtrarFacturas);
document.getElementById('filterSucursal').addEventListener('change', filtrarFacturas);
document.getElementById('filterEstado').addEventListener('change', filtrarFacturas);
document.getElementById('filterFechaInicio').addEventListener('change', filtrarFacturas);
document.getElementById('filterFechaFin').addEventListener('change', filtrarFacturas);

// Función para filtrar facturas
function filtrarFacturas() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const filterEmpresa = document.getElementById('filterEmpresa').value;
    const filterProveedor = document.getElementById('filterProveedor').value;
    const filterSucursal = document.getElementById('filterSucursal').value;
    const filterEstado = document.getElementById('filterEstado').value;
    const filterFechaInicio = document.getElementById('filterFechaInicio').value;
    const filterFechaFin = document.getElementById('filterFechaFin').value;

    // Obtener el valor del filtro personalizado seleccionado
    const selectedCustomFilter = document.querySelector('input[name="filterOption"]:checked').value;

    let filteredFacturas = facturas.filter(factura => {
        const empresa = empresas.find(e => e.id === factura.empresaId);
        const proveedor = proveedores.find(p => p.id === factura.proveedorId);

        const matchesSearch = factura.numeroFactura.toLowerCase().includes(searchInput) ||
                              (empresa ? empresa.nombre.toLowerCase().includes(searchInput) : false) ||
                              (proveedor ? proveedor.nombre.toLowerCase().includes(searchInput) : false) ||
                              factura.sucursal.toLowerCase().includes(searchInput);

        const matchesEmpresa = filterEmpresa === "" || factura.empresaId === filterEmpresa;
        const matchesProveedor = filterProveedor === "" || factura.proveedorId === filterProveedor;
        const matchesSucursal = filterSucursal === "" || factura.sucursal === filterSucursal;
        const matchesEstado = filterEstado === "" || factura.estado === filterEstado;

        let matchesFecha = true;
        if (filterFechaInicio) {
            const fechaInicio = new Date(filterFechaInicio);
            const fechaFactura = new Date(factura.fechaFactura);
            matchesFecha = fechaFactura >= fechaInicio;
        }
        if (matchesFecha && filterFechaFin) {
            const fechaFin = new Date(filterFechaFin);
            const fechaFactura = new Date(factura.fechaFactura);
            matchesFecha = fechaFactura <= fechaFin;
        }

        const matchesCustomFilter = aplicarFiltroPersonalizado(factura, selectedCustomFilter);

        return matchesSearch && matchesEmpresa && matchesProveedor && matchesSucursal && matchesEstado && matchesFecha && matchesCustomFilter;
    });

    mostrarFacturas(filteredFacturas);
}

// Función para aplicar el filtro personalizado
function aplicarFiltroPersonalizado(factura, filtro) {
    const hoy = new Date();
    const fechaVencimiento = new Date(factura.fechaVencimiento);

    switch (filtro) {
        case 'todas':
            return true;
        case 'pagadas':
            return factura.estado === 'Pagado Completamente';
        case 'porPagar':
            return factura.estado === 'Pendiente';
        case 'vencidas':
            return fechaVencimiento < hoy && factura.estado !== 'Pagado Completamente';
        case 'pagoPendiente':
            return factura.estado === 'Pagado Parcialmente';
        case 'prontoVencer':
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            return diferenciaDias >= 0 && diferenciaDias <= 8 && factura.estado !== 'Pagado Completamente';
        case 'porPagarHoy':
            return fechaVencimiento.toDateString() === hoy.toDateString() && factura.estado !== 'Pagado Completamente';
        default:
            return true;
    }
}

// Función para resetear todos los filtros
function resetearFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterEmpresa').value = '';
    document.getElementById('filterProveedor').value = '';
    document.getElementById('filterSucursal').value = '';
    document.getElementById('filterEstado').value = '';
    document.getElementById('filterFechaInicio').value = '';
    document.getElementById('filterFechaFin').value = '';
    // Seleccionar "Todas las Facturas"
    document.querySelector('input[name="filterOption"][value="todas"]').checked = true;
    mostrarFacturas(facturas);
}

// -----------------------------
// Funciones para Selección de Facturas
// -----------------------------

// Función para seleccionar/deseleccionar todas las facturas
function seleccionarTodos(source) {
    const checkboxes = document.querySelectorAll('.select-factura');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        const row = cb.closest('tr');
        if (cb.checked) {
            row.classList.add('selected-row');
        } else {
            row.classList.remove('selected-row');
        }
    });
    actualizarFacturasSeleccionadas();
}

// Función para obtener las facturas seleccionadas
function obtenerFacturasSeleccionadas() {
    const seleccionados = [];
    const checkboxes = document.querySelectorAll('.select-factura:checked');
    checkboxes.forEach(cb => {
        const factura = facturas.find(f => f.id === cb.value);
        if (factura) seleccionados.push(factura);
    });
    return seleccionados;
}

// Función para actualizar la lista de facturas seleccionadas en el modal de pago
function actualizarFacturasSeleccionadas() {
    const facturasSeleccionadas = obtenerFacturasSeleccionadas();
    const facturaDiv = document.getElementById('facturasSeleccionadas');
    facturaDiv.innerHTML = '';

    facturasSeleccionadas.forEach(factura => {
        facturaDiv.innerHTML += `<p>${factura.numeroFactura} - ${quetzalFormatter.format(factura.montoFactura)}</p>`;
    });

    // Mostrar nombre de la empresa si todas las facturas pertenecen a la misma empresa
    const empresasSeleccionadas = [...new Set(facturasSeleccionadas.map(f => f.empresaId))];
    if (empresasSeleccionadas.length === 1) {
        const empresa = empresas.find(e => e.id === empresasSeleccionadas[0]);
        document.getElementById('empresaPago').value = empresa ? empresa.nombre : '';
        cargarSucursalesEmpresaPago(empresa.id);
    } else if (empresasSeleccionadas.length > 1) {
        document.getElementById('empresaPago').value = 'Múltiples Empresas';
        document.getElementById('quienDeposito').innerHTML = '<option value="">Selecciona una sucursal</option>';
    } else {
        document.getElementById('empresaPago').value = '';
        document.getElementById('quienDeposito').innerHTML = '<option value="">Selecciona una sucursal</option>';
    }
}

// Añadir evento a cada checkbox individual para actualizar la lista y resaltar la fila
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('select-factura')) {
        const row = e.target.closest('tr');
        if (e.target.checked) {
            row.classList.add('selected-row');
        } else {
            row.classList.remove('selected-row');
        }
        actualizarFacturasSeleccionadas();
    }
});

// -----------------------------
// Funciones para Agregar Factura
// -----------------------------

// Abrir modal para agregar factura
function abrirModalFactura() {
    document.getElementById('facturaModal').style.display = 'block';
    document.getElementById('modalTitleFactura').textContent = 'Agregar Factura';
    document.getElementById('facturaForm').reset();
    poblarSelectSucursalModal();
}

// Cerrar modal de factura
function cerrarModalFactura() {
    document.getElementById('facturaModal').style.display = 'none';
}

// Manejar formulario de factura (Agregar)
document.getElementById('facturaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const empresaId = document.getElementById('empresa').value;
    const sucursal = document.getElementById('sucursal').value;
    const proveedorId = document.getElementById('proveedor').value;
    const fechaFactura = document.getElementById('fechaFactura').value;
    const numeroFactura = document.getElementById('numeroFactura').value.trim();
    const montoFactura = parseFloat(document.getElementById('montoFactura').value);
    const fechaVencimiento = document.getElementById('fechaVencimiento').value;
    const estado = document.getElementById('estado').value;

    // Validación de factura duplicada
    if (verificarFacturaDuplicada(numeroFactura)) {
        Swal.fire('Error', 'Ya existe una factura con este número.', 'error');
        return;
    }

    // Convertir fechaFactura a Timestamp de Firebase
    const fechaFacturaTimestamp = firebase.firestore.Timestamp.fromDate(new Date(fechaFactura));

    db.collection("facturas").add({
        empresaId: empresaId,
        proveedorId: proveedorId,
        sucursal: sucursal,
        fechaFactura: fechaFactura,
        fechaFacturaTimestamp: fechaFacturaTimestamp,
        numeroFactura: numeroFactura,
        montoFactura: montoFactura,
        fechaVencimiento: fechaVencimiento,
        estado: estado
    })
    .then(() => {
        Swal.fire('Éxito', 'Factura agregada correctamente', 'success');
        cerrarModalFactura();
        document.getElementById('facturaForm').reset();
    })
    .catch(error => {
        console.error('Error al agregar factura:', error);
        Swal.fire('Error', 'Hubo un problema al agregar la factura', 'error');
    });
});

// Calcular fecha de vencimiento basada en días de crédito del proveedor
function calcularFechaVencimiento() {
    const proveedorId = document.getElementById('proveedor').value;
    const fechaFactura = document.getElementById('fechaFactura').value;
    if (proveedorId && fechaFactura) {
        const proveedor = proveedores.find(p => p.id === proveedorId);
        if (proveedor) {
            const diasCredito = proveedor.diasCredito;
            const fechaFacturaDate = new Date(fechaFactura);
            fechaFacturaDate.setDate(fechaFacturaDate.getDate() + diasCredito);
            const fechaVencimiento = fechaFacturaDate.toISOString().split('T')[0];
            document.getElementById('fechaVencimiento').value = fechaVencimiento;
        }
    }
}

// Eventos para calcular fecha de vencimiento al cambiar proveedor o fecha de factura
document.getElementById('proveedor').addEventListener('change', calcularFechaVencimiento);
document.getElementById('fechaFactura').addEventListener('change', calcularFechaVencimiento);

// Función para poblar sucursales en el modal de factura cuando cambia la empresa
document.getElementById('empresa').addEventListener('change', poblarSelectSucursalModal);

// -----------------------------
// Funciones para Registrar Pago
// -----------------------------

// Abrir modal para registrar pago
function abrirModalPago() {
    const facturasSeleccionadas = obtenerFacturasSeleccionadas();
    if (facturasSeleccionadas.length === 0) {
        Swal.fire('Error', 'Debes seleccionar al menos una factura para registrar un pago.', 'error');
        return;
    }

    // Verificar si todas las facturas pertenecen a la misma empresa
    const empresasSeleccionadas = [...new Set(facturasSeleccionadas.map(f => f.empresaId))];
    if (empresasSeleccionadas.length > 1) {
        Swal.fire('Error', 'Las facturas seleccionadas pertenecen a múltiples empresas. Selecciona facturas de una sola empresa.', 'error');
        return;
    }

    document.getElementById('pagoModal').style.display = 'block';
    mostrarFacturasSeleccionadas();
}

// Cerrar modal de pago
function cerrarModalPago() {
    document.getElementById('pagoModal').style.display = 'none';
    // Deseleccionar todas las facturas
    const checkboxes = document.querySelectorAll('.select-factura');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('tr').classList.remove('selected-row');
    });
    actualizarFacturasSeleccionadas();
}

// Mostrar facturas seleccionadas en el modal de pago
function mostrarFacturasSeleccionadas() {
    actualizarFacturasSeleccionadas();
}

// Cargar sucursales de la empresa seleccionada en "Quién Pagó"
function cargarSucursalesEmpresaPago(empresaId) {
    const quienDepositoSelect = document.getElementById('quienDeposito');
    quienDepositoSelect.innerHTML = '<option value="">Selecciona una sucursal</option>';
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa && empresa.sucursales) {
        empresa.sucursales.forEach(sucursal => {
            const option = document.createElement('option');
            option.value = sucursal;
            option.textContent = sucursal;
            quienDepositoSelect.appendChild(option);
        });
    }
}

// Manejar formulario de pago (Registrar)
document.getElementById('pagoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const idBoleta = document.getElementById('idBoleta').value.trim();
    const facturasSeleccionadas = obtenerFacturasSeleccionadas();
    const facturasIds = facturasSeleccionadas.map(f => f.id);
    const cantidadTotal = parseFloat(document.getElementById('cantidad').value);
    const totalFacturas = facturasSeleccionadas.reduce((total, factura) => total + factura.montoFactura, 0);

    // Validar que la cantidad ingresada no sea negativa
    if (cantidadTotal < 0) {
        Swal.fire('Error', 'La cantidad a pagar no puede ser negativa.', 'error');
        return;
    }

    // Distribuir la cantidad ingresada entre las facturas seleccionadas
    // Aquí, se distribuirá proporcionalmente según el monto de cada factura
    let montosAplicados = {};
    facturasSeleccionadas.forEach(factura => {
        const proporción = factura.montoFactura / totalFacturas;
        montosAplicados[factura.id] = parseFloat((cantidadTotal * proporción).toFixed(2));
    });

    // Ajustar por posibles errores de redondeo
    const sumaAplicada = Object.values(montosAplicados).reduce((a, b) => a + b, 0);
    const diferencia = parseFloat((cantidadTotal - sumaAplicada).toFixed(2));
    if (diferencia !== 0) {
        const primeraFacturaId = facturasSeleccionadas[0].id;
        montosAplicados[primeraFacturaId] += diferencia;
    }

    // Verificar pagos duplicados
    if (verificarPagoDuplicado(idBoleta, facturasIds)) {
        Swal.fire('Error', 'Ya existe un pago con este ID de Boleta para las facturas seleccionadas.', 'error');
        return;
    }

    const formaPago = document.getElementById('formaPago').value;
    const banco = document.getElementById('banco').value.trim();
    const quienDeposito = document.getElementById('quienDeposito').value;
    const fechaPago = new Date().toISOString().split('T')[0];

    if (!formaPago || !banco || !quienDeposito) {
        Swal.fire('Error', 'Por favor, completa todos los campos requeridos.', 'error');
        return;
    }

    const pagoData = {
        facturasIds: facturasIds,
        montosAplicados: montosAplicados, // Asignar monto a cada factura
        idBoleta: idBoleta,
        cantidad: cantidadTotal,
        formaPago: formaPago,
        banco: banco,
        quienDeposito: quienDeposito,
        totalBoleta: cantidadTotal,
        fechaPago: fechaPago
    };

    db.collection("pagos").add(pagoData)
        .then(() => {
            // Actualizar el estado de cada factura
            facturasSeleccionadas.forEach(factura => {
                actualizarEstadoFactura(factura.id);
            });
            Swal.fire('Éxito', 'Pago registrado correctamente', 'success');
            cerrarModalPago();
        })
        .catch(error => {
            console.error('Error al registrar pago:', error);
            Swal.fire('Error', 'Hubo un problema al registrar el pago', 'error');
        });
});

// Función para actualizar el estado de una factura
function actualizarEstadoFactura(facturaId) {
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;

    const montoPagado = calcularMontoPagadoSync(facturaId);
    let nuevoEstado = 'Pendiente';
    if (montoPagado === 0) {
        nuevoEstado = 'Pendiente';
    } else if (montoPagado > 0 && montoPagado < factura.montoFactura) {
        nuevoEstado = 'Pagado Parcialmente';
    } else if (montoPagado >= factura.montoFactura) {
        nuevoEstado = 'Pagado Completamente';
    }

    db.collection("facturas").doc(facturaId).update({
        estado: nuevoEstado
    }).then(() => {
        // No es necesario refrescar las facturas aquí, ya que el listener onSnapshot lo hace automáticamente
    }).catch(error => {
        console.error('Error al actualizar estado de factura:', error);
        Swal.fire('Error', 'Hubo un problema al actualizar el estado de la factura.', 'error');
    });
}

// -----------------------------
// Funciones para Mostrar y CRUD de Pagos
// -----------------------------

// Mostrar pagos registrados para las facturas seleccionadas
function mostrarPagos() {
    const facturasSeleccionadas = obtenerFacturasSeleccionadas();
    if (facturasSeleccionadas.length === 0) {
        Swal.fire('Error', 'Debes seleccionar al menos una factura para ver sus pagos.', 'error');
        return;
    }

    // Abrir el modal
    document.getElementById('mostrarPagosModal').style.display = 'block';

    const listaPagosDiv = document.getElementById('listaPagos');
    listaPagosDiv.innerHTML = '';

    // Obtener todos los pagos asociados a las facturas seleccionadas
    const pagosFactura = pagos.filter(pago => pago.facturasIds.some(id => facturasSeleccionadas.some(f => f.id === id)));

    if (pagosFactura.length === 0) {
        listaPagosDiv.innerHTML = '<p>No hay pagos registrados para las facturas seleccionadas.</p>';
        return;
    }

    pagosFactura.forEach(pago => {
        const montoPagoAplicado = calcularMontoPagoAplicadoMultiple(pago, facturasSeleccionadas);
        listaPagosDiv.innerHTML += `
            <div class="pago-item">
                <p><strong>ID Boleta:</strong> ${pago.idBoleta}</p>
                <p><strong>Total Boleta:</strong> ${quetzalFormatter.format(pago.totalBoleta)}</p>
                <p><strong>Monto Aplicado a Facturas Seleccionadas:</strong> ${quetzalFormatter.format(montoPagoAplicado)}</p>
                <p><strong>Forma de Pago:</strong> ${pago.formaPago}</p>
                <p><strong>Banco:</strong> ${pago.banco}</p>
                <p><strong>Quién Pagó:</strong> ${pago.quienDeposito}</p>
                <p><strong>Fecha de Pago:</strong> ${pago.fechaPago}</p>
                <button onclick="abrirModalEditarPago('${pago.id}')">Editar</button>
                <button onclick="eliminarPago('${pago.id}')">Eliminar</button>
                <hr>
            </div>
        `;
    });
}

// Cerrar modal de mostrar pagos
function cerrarModalMostrarPagos() {
    document.getElementById('mostrarPagosModal').style.display = 'none';
}

// Abrir modal para editar pago
function abrirModalEditarPago(pagoId) {
    const pagoSeleccionado = pagos.find(p => p.id === pagoId);
    if (pagoSeleccionado) {
        document.getElementById('editarPagoModal').style.display = 'block';
        document.getElementById('editarPagoForm').reset();

        document.getElementById('editarPagoId').value = pagoSeleccionado.id;
        document.getElementById('editarIdBoleta').value = pagoSeleccionado.idBoleta;
        document.getElementById('editarCantidad').value = pagoSeleccionado.cantidad.toFixed(2);
        document.getElementById('editarFormaPago').value = pagoSeleccionado.formaPago;
        document.getElementById('editarBanco').value = pagoSeleccionado.banco;
        document.getElementById('editarQuienDeposito').value = pagoSeleccionado.quienDeposito;
        document.getElementById('editarFechaPago').value = pagoSeleccionado.fechaPago;
    }
}

// Cerrar modal de editar pago
function cerrarModalEditarPago() {
    document.getElementById('editarPagoModal').style.display = 'none';
}

// Manejar formulario de editar pago
document.getElementById('editarPagoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const pagoId = document.getElementById('editarPagoId').value;
    const cantidad = parseFloat(document.getElementById('editarCantidad').value);
    const formaPago = document.getElementById('editarFormaPago').value;
    const banco = document.getElementById('editarBanco').value.trim();
    const quienDeposito = document.getElementById('editarQuienDeposito').value.trim();
    const fechaPago = document.getElementById('editarFechaPago').value;

    if (!formaPago || !banco || !quienDeposito) {
        Swal.fire('Error', 'Por favor, completa todos los campos requeridos.', 'error');
        return;
    }

    db.collection("pagos").doc(pagoId).update({
        cantidad: cantidad,
        formaPago: formaPago,
        banco: banco,
        quienDeposito: quienDeposito,
        fechaPago: fechaPago
    })
    .then(() => {
        Swal.fire('Éxito', 'Pago actualizado correctamente', 'success');
        cerrarModalEditarPago();
    })
    .catch(error => {
        console.error('Error al actualizar pago:', error);
        Swal.fire('Error', 'Hubo un problema al actualizar el pago.', 'error');
    });
});

// Eliminar pago
function eliminarPago(pagoId) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción eliminará el pago seleccionado.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection("pagos").doc(pagoId).delete()
                .then(() => {
                    Swal.fire('Eliminado', 'El pago ha sido eliminado', 'success');
                })
                .catch(error => {
                    console.error('Error al eliminar pago:', error);
                    Swal.fire('Error', 'Hubo un problema al eliminar el pago.', 'error');
                });
        }
    });
}

// -----------------------------
// Funciones para Prevención de Duplicados
// -----------------------------

// Verificar si la factura ya existe antes de agregar
function verificarFacturaDuplicada(numeroFactura) {
    return facturas.some(factura => factura.numeroFactura.toLowerCase() === numeroFactura.toLowerCase());
}

// Verificar si el pago ya existe antes de agregar
function verificarPagoDuplicado(idBoleta, facturasIds) {
    return pagos.some(pago => 
        pago.idBoleta.toLowerCase() === idBoleta.toLowerCase() &&
        arraysEqual(pago.facturasIds, facturasIds)
    );
}

// Función auxiliar para comparar dos arreglos
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    a = a.slice().sort();
    b = b.slice().sort();
    return a.every((val, index) => val === b[index]);
}

// -----------------------------
// Funciones para Registrar Pago
// -----------------------------

// Función para calcular el monto pagado de forma síncrona
function calcularMontoPagadoSync(facturaId) {
    let montoPagado = 0;
    pagos.forEach(pago => {
        if (pago.facturasIds.includes(facturaId)) {
            montoPagado += pago.montosAplicados[facturaId] || 0;
        }
    });
    return montoPagado;
}

// Obtener el último pago asociado a una factura
function obtenerUltimoPagoFactura(facturaId) {
    const pagosFactura = pagos.filter(pago => pago.facturasIds.includes(facturaId));
    if (pagosFactura.length > 0) {
        // Suponiendo que el último pago es el más reciente basado en fechaPago
        pagosFactura.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));
        return pagosFactura[0];
    }
    return null;
}

// Obtener monto del pago aplicado a la factura en un pago específico
function obtenerMontoPagoAplicado(facturaId, pago) {
    if (pago.facturasIds.includes(facturaId)) {
        return pago.montosAplicados ? pago.montosAplicados[facturaId] || 0 : 0;
    }
    return 0;
}

// Función para calcular el monto aplicado a múltiples facturas
function calcularMontoPagoAplicadoMultiple(pago, facturasSeleccionadas) {
    let monto = 0;
    facturasSeleccionadas.forEach(factura => {
        if (pago.facturasIds.includes(factura.id)) {
            monto += pago.montosAplicados[factura.id] || 0;
        }
    });
    return monto;
}

// -----------------------------
// Funciones para Eliminar Facturas
// -----------------------------

// Manejar el botón para eliminar facturas seleccionadas
document.getElementById('eliminarFacturasBtn').addEventListener('click', eliminarFacturasSeleccionadas);

// Función para eliminar las facturas seleccionadas
function eliminarFacturasSeleccionadas() {
    const facturasSeleccionadas = obtenerFacturasSeleccionadas();
    if (facturasSeleccionadas.length === 0) {
        Swal.fire('Error', 'Debes seleccionar al menos una factura para eliminar.', 'error');
        return;
    }

    Swal.fire({
        title: '¿Estás seguro?',
        text: `Esta acción eliminará ${facturasSeleccionadas.length} factura(s). Esta operación no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Crear un array de promesas para eliminar todas las facturas seleccionadas
            const eliminaciones = facturasSeleccionadas.map(factura => db.collection("facturas").doc(factura.id).delete());

            Promise.all(eliminaciones)
                .then(() => {
                    Swal.fire('Eliminado', 'Las facturas seleccionadas han sido eliminadas.', 'success');
                    // Opcional: Deseleccionar todas las facturas y actualizar la vista
                    const checkboxes = document.querySelectorAll('.select-factura');
                    checkboxes.forEach(cb => {
                        cb.checked = false;
                        cb.closest('tr').classList.remove('selected-row');
                    });
                    actualizarFacturasSeleccionadas();
                })
                .catch(error => {
                    console.error('Error al eliminar facturas:', error);
                    Swal.fire('Error', 'Hubo un problema al eliminar las facturas.', 'error');
                });
        }
    });
}

// -----------------------------
// Funciones para Utilidades y Eventos Globales
// -----------------------------

// Función para agregar eventos globales
function agregarEventosGlobales() {
    // Evento para cerrar modales al hacer clic fuera del contenido
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    };
}

// -----------------------------
// Inicialización
// -----------------------------
window.onload = function() {
    cargarDatosIniciales();
};
