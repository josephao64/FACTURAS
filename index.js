// =========================
// Variables Globales
// =========================
let facturas = [];
let pagos = [];
let empresas = [];
let proveedores = [];

// Formateador de moneda (Quetzales)
const quetzalFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2
});

// =========================
// Funciones de Utilidad
// =========================

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  a = a.slice().sort();
  b = b.slice().sort();
  return a.every((val, index) => val === b[index]);
}

function calcularMontoPagadoSync(facturaId) {
  let montoPagado = 0;
  pagos.forEach(pago => {
    if (pago.facturasIds.includes(facturaId)) {
      montoPagado += pago.montosAplicados[facturaId] || 0;
    }
  });
  return montoPagado;
}

function obtenerUltimoPagoFactura(facturaId) {
  const pagosFactura = pagos.filter(pago => pago.facturasIds.includes(facturaId));
  if (pagosFactura.length > 0) {
    pagosFactura.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));
    return pagosFactura[0];
  }
  return null;
}

function obtenerMontoPagoAplicado(facturaId, pago) {
  if (pago.facturasIds.includes(facturaId)) {
    return pago.montosAplicados ? pago.montosAplicados[facturaId] || 0 : 0;
  }
  return 0;
}

function verificarPagoDuplicado(idBoleta, facturasIds) {
  return pagos.some(pago => 
    pago.idBoleta.toLowerCase() === idBoleta.toLowerCase() &&
    arraysEqual(pago.facturasIds, facturasIds)
  );
}

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
  }).catch(error => {
    console.error('Error al actualizar estado de factura:', error);
    Swal.fire('Error', 'Hubo un problema al actualizar el estado de la factura.', 'error');
  });
}

// =========================
// Poblar Selects
// =========================

function poblarSelectEmpresasFacturaModal() {
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

function poblarSelectProveedoresFacturaModal() {
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

function poblarSelectSucursalFilter() {
  const sucursalFilter = document.getElementById('filterSucursal');
  if (sucursalFilter) {
    sucursalFilter.innerHTML = '<option value="">Todas las Sucursales</option>';
    const sucursalesUnicas = [...new Set(empresas.flatMap(e => e.sucursales))];
    sucursalesUnicas.forEach(sucursal => {
      const option = document.createElement('option');
      option.value = sucursal;
      option.textContent = sucursal;
      sucursalFilter.appendChild(option);
    });
  }
}

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

function poblarSelectBoletasConSaldo() {
  const boletaSaldoSelect = document.getElementById('boletaSaldo');
  if (boletaSaldoSelect) {
    boletaSaldoSelect.innerHTML = '<option value="">Selecciona una Boleta</option>';
    const boletasConSaldo = pagos.filter(pago => pago.saldo && pago.saldo > 0);
    boletasConSaldo.forEach(boleta => {
      const option = document.createElement('option');
      option.value = boleta.id;
      option.textContent = `Boleta ID: ${boleta.idBoleta} - Saldo: ${quetzalFormatter.format(boleta.saldo)}`;
      boletaSaldoSelect.appendChild(option);
    });
  }
}

// =========================
// Mostrar Facturas
// =========================

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

      const ultimoPago = obtenerUltimoPagoFactura(factura.id);
      const montoPagoAplicado = ultimoPago ? obtenerMontoPagoAplicado(factura.id, ultimoPago) : 0;

      let filaClase = 'sin-pagos'; 
      const hoy = new Date();
      const fechaVencimiento = new Date(factura.fechaVencimiento);
      if (fechaVencimiento < hoy && factura.estado !== 'Pagado Completamente') {
        filaClase = 'vencida';
      } else {
        switch (factura.estado) {
          case 'Pagado Parcialmente':
            filaClase = 'pagado-parcialmente';
            break;
          case 'Pagado Completamente':
            filaClase = 'pagado-completamente';
            break;
          case 'Pendiente':
            filaClase = 'sin-pagos';
            break;
          default:
            filaClase = 'sin-pagos';
        }
      }

      const tr = document.createElement('tr');
      tr.classList.add(filaClase);
      tr.setAttribute('data-id', factura.id);
      tr.innerHTML = `
        <td><input type="checkbox" class="select-factura" value="${factura.id}" onclick="actualizarFilaSeleccionada(this)"></td>
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
        <td>
          <button class="edit-btn" onclick="abrirModalEditarFactura('${factura.id}')">Editar</button>
          <button class="delete-btn" onclick="eliminarFactura('${factura.id}')">Eliminar</button>
          <button class="show-pagos-btn" onclick="mostrarPagosDeFactura('${factura.id}')">Mostrar Pagos</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    document.getElementById('totalFacturas').textContent = quetzalFormatter.format(totalFacturas);
    document.getElementById('totalPagado').textContent = quetzalFormatter.format(totalPagado);
  }
}

// =========================
// Boletas con Saldo
// =========================

function cargarBoletasConSaldo() {
  const boletasTableBody = document.querySelector('#boletasTable tbody');
  if (!boletasTableBody) return;

  boletasTableBody.innerHTML = '';

  const boletasConSaldo = pagos.filter(pago => pago.saldo && pago.saldo > 0);

  if (boletasConSaldo.length === 0) {
    boletasTableBody.innerHTML = '<tr><td colspan="6">No hay boletas con saldo disponible.</td></tr>';
    return;
  }

  boletasConSaldo.forEach(boleta => {
    const tr = document.createElement('tr');

    const tdIdBoleta = document.createElement('td');
    tdIdBoleta.textContent = boleta.idBoleta;
    tr.appendChild(tdIdBoleta);

    const tdCantidadTotal = document.createElement('td');
    tdCantidadTotal.textContent = quetzalFormatter.format(boleta.cantidad);
    tr.appendChild(tdCantidadTotal);

    const tdSaldo = document.createElement('td');
    tdSaldo.textContent = quetzalFormatter.format(boleta.saldo);
    tr.appendChild(tdSaldo);

    const tdFacturas = document.createElement('td');
    if (boleta.facturasIds && boleta.facturasIds.length > 0) {
      const listaFacturas = document.createElement('ul');
      boleta.facturasIds.forEach(facturaId => {
        const factura = facturas.find(f => f.id === facturaId);
        const li = document.createElement('li');
        li.textContent = `Factura ${factura ? factura.numeroFactura : facturaId}`;
        listaFacturas.appendChild(li);
      });
      tdFacturas.appendChild(listaFacturas);
    } else {
      tdFacturas.textContent = 'No aplicada a facturas';
    }
    tr.appendChild(tdFacturas);

    const tdCantidadAplicada = document.createElement('td');
    if (boleta.montosAplicados && Object.keys(boleta.montosAplicados).length > 0) {
      const listaMontos = document.createElement('ul');
      Object.entries(boleta.montosAplicados).forEach(([facturaId, monto]) => {
        const factura = facturas.find(f => f.id === facturaId);
        const li = document.createElement('li');
        li.textContent = `${factura ? factura.numeroFactura : facturaId}: ${quetzalFormatter.format(monto)}`;
        listaMontos.appendChild(li);
      });
      tdCantidadAplicada.appendChild(listaMontos);
    } else {
      tdCantidadAplicada.textContent = 'No aplicada';
    }
    tr.appendChild(tdCantidadAplicada);

    const tdAcciones = document.createElement('td');
    tdAcciones.innerHTML = `
      <button class="aplicar-boleta-btn" data-boleta-id="${boleta.id}" onclick="abrirModalAplicarBoleta('${boleta.id}')">Aplicar Boleta</button>
    `;
    tr.appendChild(tdAcciones);

    boletasTableBody.appendChild(tr);
  });
}

// =========================
// Validaciones de Factura
// =========================

function agregarOEditarFactura(facturaId, nuevaFactura) {
  const { empresaId, proveedorId, numeroFactura } = nuevaFactura;

  return db.collection("facturas")
    .where("numeroFactura", "==", numeroFactura)
    .where("empresaId", "==", empresaId)
    .where("proveedorId", "==", proveedorId)
    .get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        const existeOtra = querySnapshot.docs.some(doc => doc.id !== facturaId);
        if (existeOtra) {
          Swal.fire('Error', 'Ya existe una factura con este número para esta empresa y proveedor.', 'error');
          return false;
        }
      }
      return true;
    })
    .catch(error => {
      console.error('Error al verificar factura duplicada:', error);
      Swal.fire('Error', 'Hubo un problema al verificar la factura duplicada.', 'error');
      return false;
    });
}

// =========================
// Modales y Funciones de Factura
// =========================

function abrirModalFactura() {
  const facturaModal = document.getElementById('facturaModal');
  if (facturaModal) {
    facturaModal.style.display = 'block';
    document.getElementById('facturaForm').reset();
    document.getElementById('modalTitleFactura').textContent = 'Agregar Factura';
    facturaModal.removeAttribute('data-factura-id');
    poblarSelectSucursalModal();
  }
}

function cerrarModalFactura() {
  const facturaModal = document.getElementById('facturaModal');
  if (facturaModal) {
    facturaModal.style.display = 'none';
  }
}

document.getElementById('facturaForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const facturaModal = document.getElementById('facturaModal');
  const empresaId = document.getElementById('empresa').value;
  const sucursal = document.getElementById('sucursal').value;
  const proveedorId = document.getElementById('proveedor').value;
  const fechaFactura = document.getElementById('fechaFactura').value;
  const numeroFactura = document.getElementById('numeroFactura').value;
  const montoFactura = parseFloat(document.getElementById('montoFactura').value);
  const fechaVencimiento = document.getElementById('fechaVencimiento').value;
  const estado = document.getElementById('estado').value;

  if (!empresaId || !sucursal || !proveedorId || !fechaFactura || !numeroFactura || isNaN(montoFactura) || montoFactura < 0 || !fechaVencimiento || !estado) {
    Swal.fire('Error', 'Por favor, completa todos los campos requeridos.', 'error');
    return;
  }

  const facturaId = facturaModal.getAttribute('data-factura-id');

  const nuevaFactura = {
    empresaId,
    sucursal,
    proveedorId,
    fechaFactura,
    numeroFactura,
    montoFactura,
    fechaVencimiento,
    estado
  };

  const esValido = await agregarOEditarFactura(facturaId || null, nuevaFactura);
  if (!esValido) return;

  if (facturaId) {
    db.collection("facturas").doc(facturaId).update(nuevaFactura)
      .then(() => {
        Swal.fire('Éxito', 'Factura actualizada correctamente.', 'success');
        cerrarModalFactura();
      })
      .catch(error => {
        console.error('Error al actualizar factura:', error);
        Swal.fire('Error', 'Hubo un problema al actualizar la factura.', 'error');
      });
  } else {
    db.collection("facturas").add(nuevaFactura)
      .then(() => {
        Swal.fire('Éxito', 'Factura agregada correctamente.', 'success');
        cerrarModalFactura();
      })
      .catch(error => {
        console.error('Error al agregar factura:', error);
        Swal.fire('Error', 'Hubo un problema al agregar la factura.', 'error');
      });
  }
});

function abrirModalPago() {
  const facturasSeleccionadas = obtenerFacturasSeleccionadas();
  if (facturasSeleccionadas.length === 0) {
    Swal.fire('Atención', 'Selecciona al menos una factura para registrar un pago.', 'info');
    return;
  }
  const pagoModal = document.getElementById('pagoModal');
  if (pagoModal) {
    pagoModal.style.display = 'block';
    document.getElementById('pagoForm').reset();
    document.getElementById('empresaPago').value = '';
    cargarSucursalesEmpresaPago('');
    actualizarFacturasSeleccionadas();
  }
}

function cerrarModalPago() {
  const pagoModal = document.getElementById('pagoModal');
  if (pagoModal) {
    pagoModal.style.display = 'none';
  }
}

function mostrarPagos() {
  const mostrarPagosModal = document.getElementById('mostrarPagosModal');
  if (mostrarPagosModal) {
    mostrarPagosModal.style.display = 'block';
    cargarListaPagos(); 
  }
}

function cerrarModalMostrarPagos() {
  const mostrarPagosModal = document.getElementById('mostrarPagosModal');
  if (mostrarPagosModal) {
    mostrarPagosModal.style.display = 'none';
  }
}

function cerrarModalEditarPago() {
  const editarPagoModal = document.getElementById('editarPagoModal');
  if (editarPagoModal) {
    editarPagoModal.style.display = 'none';
  }
}

function cerrarModalAplicarBoleta() {
  const aplicarBoletaModal = document.getElementById('aplicarBoletaModal');
  if (aplicarBoletaModal) {
    aplicarBoletaModal.style.display = 'none';
  }
}

function abrirModalEditarFactura(facturaId) {
  const factura = facturas.find(f => f.id === facturaId);
  if (!factura) {
    Swal.fire('Error', 'Factura no encontrada.', 'error');
    return;
  }

  const facturaModal = document.getElementById('facturaModal');
  if (facturaModal) {
    facturaModal.style.display = 'block';
    document.getElementById('modalTitleFactura').textContent = 'Editar Factura';

    document.getElementById('empresa').value = factura.empresaId;
    poblarSelectSucursalModal();
    document.getElementById('sucursal').value = factura.sucursal;
    document.getElementById('proveedor').value = factura.proveedorId;
    document.getElementById('fechaFactura').value = factura.fechaFactura;
    document.getElementById('numeroFactura').value = factura.numeroFactura;
    document.getElementById('montoFactura').value = factura.montoFactura;
    document.getElementById('fechaVencimiento').value = factura.fechaVencimiento;
    document.getElementById('estado').value = factura.estado;

    facturaModal.setAttribute('data-factura-id', facturaId);
  }
}

function eliminarFactura(facturaId) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: "Esta acción eliminará la factura seleccionada.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      db.collection("facturas").doc(facturaId).delete()
        .then(() => {
          Swal.fire('Eliminado', 'La factura ha sido eliminada.', 'success');
        })
        .catch(error => {
          console.error('Error al eliminar factura:', error);
          Swal.fire('Error', 'Hubo un problema al eliminar la factura.', 'error');
        });
    }
  });
}

// =========================
// Validación antes de agregar Pago (Boleta)
// =========================

function verificarBoletaDuplicada(idBoleta) {
  return db.collection("pagos").where("idBoleta", "==", idBoleta).get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        Swal.fire('Error', 'Ya existe una boleta con ese ID Boleta.', 'error');
        return false;
      }
      return true;
    })
    .catch(error => {
      console.error('Error al verificar boleta duplicada:', error);
      Swal.fire('Error', 'Hubo un problema al verificar la boleta duplicada.', 'error');
      return false;
    });
}

// =========================
// Manejo de Pagos (Registrar/Editar/Eliminar)
// =========================

document.getElementById('pagoForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const idBoleta = document.getElementById('idBoleta').value.trim();
  const facturasSeleccionadas = obtenerFacturasSeleccionadas();
  let cantidadPago = parseFloat(document.getElementById('cantidad').value);
  const formaPago = document.getElementById('formaPago').value;
  const banco = document.getElementById('banco').value.trim();
  const quienDeposito = document.getElementById('quienDeposito').value;
  const empresaPago = document.getElementById('empresaPago').value.trim();

  if (!idBoleta || facturasSeleccionadas.length === 0 || isNaN(cantidadPago) || cantidadPago <= 0 || !formaPago || !banco || !quienDeposito || !empresaPago) {
    Swal.fire('Error', 'Por favor, completa todos los campos requeridos correctamente.', 'error');
    return;
  }

  const puedeContinuar = await verificarBoletaDuplicada(idBoleta);
  if (!puedeContinuar) return;

  const montosAplicados = {};
  let montoTotalAplicado = 0;
  let montoRestante = cantidadPago;

  facturasSeleccionadas.forEach(factura => {
    const montoPendiente = factura.montoFactura - calcularMontoPagadoSync(factura.id);
    if (montoPendiente > 0 && montoRestante > 0) {
      const montoAplicado = Math.min(montoPendiente, montoRestante);
      montosAplicados[factura.id] = montoAplicado;
      montoTotalAplicado += montoAplicado;
      montoRestante -= montoAplicado;
    }
  });

  const leftover = montoRestante > 0 ? montoRestante : 0;

  const facturasIds = facturasSeleccionadas.map(f => f.id);
  if (verificarPagoDuplicado(idBoleta, facturasIds)) {
    Swal.fire('Error', 'Este pago ya ha sido registrado para las facturas seleccionadas.', 'error');
    return;
  }

  const nuevoPago = {
    idBoleta,
    facturasIds,
    montosAplicados,
    cantidad: cantidadPago,
    formaPago,
    banco,
    quienDeposito,
    fechaPago: new Date().toISOString().split('T')[0],
    saldo: leftover
  };

  if (leftover > 0) {
    Swal.fire({
      title: 'Advertencia',
      text: `El pago excede el monto total de las facturas seleccionadas en ${quetzalFormatter.format(leftover)}. Este excedente se convertirá en una boleta con saldo disponible para aplicar a otras facturas. ¿Deseas continuar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        db.collection("pagos").add(nuevoPago)
          .then(() => {
            facturasSeleccionadas.forEach(factura => {
              actualizarEstadoFactura(factura.id);
            });
            Swal.fire('Éxito', 'Pago registrado correctamente. Se generó una boleta con saldo.', 'success');
            cerrarModalPago();
          })
          .catch(error => {
            console.error('Error al registrar pago:', error);
            Swal.fire('Error', 'Hubo un problema al registrar el pago.', 'error');
          });
      }
    });
  } else {
    db.collection("pagos").add(nuevoPago)
      .then(() => {
        facturasSeleccionadas.forEach(factura => {
          actualizarEstadoFactura(factura.id);
        });
        Swal.fire('Éxito', 'Pago registrado correctamente.', 'success');
        cerrarModalPago();
      })
      .catch(error => {
        console.error('Error al registrar pago:', error);
        Swal.fire('Error', 'Hubo un problema al registrar el pago.', 'error');
      });
  }
});

function abrirModalEditarPago(pagoId) {
  const pagoSeleccionado = pagos.find(p => p.id === pagoId);
  if (pagoSeleccionado) {
    const editarPagoModal = document.getElementById('editarPagoModal');
    if (editarPagoModal) {
      editarPagoModal.style.display = 'block';
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
}

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
          Swal.fire('Eliminado', 'El pago ha sido eliminado.', 'success');
        })
        .catch(error => {
          console.error('Error al eliminar pago:', error);
          Swal.fire('Error', 'Hubo un problema al eliminar el pago.', 'error');
        });
    }
  });
}

document.getElementById('editarPagoForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const pagoId = document.getElementById('editarPagoId').value;
  const cantidad = parseFloat(document.getElementById('editarCantidad').value);
  const formaPago = document.getElementById('editarFormaPago').value;
  const banco = document.getElementById('editarBanco').value.trim();
  const quienDeposito = document.getElementById('editarQuienDeposito').value.trim();
  const fechaPago = document.getElementById('editarFechaPago').value;

  if (!formaPago || !banco || !quienDeposito || isNaN(cantidad) || cantidad <= 0) {
    Swal.fire('Error', 'Por favor, completa todos los campos requeridos correctamente.', 'error');
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
    Swal.fire('Éxito', 'Pago actualizado correctamente.', 'success');
    cerrarModalEditarPago();
  })
  .catch(error => {
    console.error('Error al actualizar pago:', error);
    Swal.fire('Error', 'Hubo un problema al actualizar el pago.', 'error');
  });
});

function cargarListaPagos() {
  const listaPagosDiv = document.getElementById('listaPagos');
  if (!listaPagosDiv) return;

  listaPagosDiv.innerHTML = '';

  if (pagos.length === 0) {
    listaPagosDiv.innerHTML = '<p>No hay pagos registrados.</p>';
    return;
  }

  pagos.forEach(pago => {
    const pagoItem = document.createElement('div');
    pagoItem.classList.add('pago-item');
    pagoItem.innerHTML = `
      <p><strong>ID Boleta:</strong> ${pago.idBoleta}</p>
      <p><strong>Total de la Boleta:</strong> ${quetzalFormatter.format(pago.cantidad)}</p>
      <p><strong>Saldo:</strong> ${quetzalFormatter.format(pago.saldo || 0)}</p>
      <p><strong>Forma de Pago:</strong> ${pago.formaPago}</p>
      <p><strong>Banco:</strong> ${pago.banco}</p>
      <p><strong>Quién Deposito:</strong> ${pago.quienDeposito}</p>
      <p><strong>Fecha de Pago:</strong> ${pago.fechaPago}</p>
      <button onclick="abrirModalEditarPago('${pago.id}')">Editar</button>
      <button onclick="eliminarPago('${pago.id}')">Eliminar</button>
      <hr>
    `;
    listaPagosDiv.appendChild(pagoItem);
  });
}

function mostrarPagosDeFactura(facturaId) {
  const listaPagosDiv = document.getElementById('listaPagos');
  if (!listaPagosDiv) return;

  const pagosDeLaFactura = pagos.filter(pago => pago.facturasIds.includes(facturaId));

  const mostrarPagosModal = document.getElementById('mostrarPagosModal');
  if (mostrarPagosModal) {
    mostrarPagosModal.style.display = 'block';
  }

  listaPagosDiv.innerHTML = '';

  if (pagosDeLaFactura.length === 0) {
    listaPagosDiv.innerHTML = '<p>No hay pagos registrados para esta factura.</p>';
    return;
  }

  pagosDeLaFactura.forEach(pago => {
    const montoAplicado = pago.montosAplicados[facturaId] || 0;
    const pagoItem = document.createElement('div');
    pagoItem.classList.add('pago-item');
    pagoItem.innerHTML = `
      <p><strong>ID Boleta:</strong> ${pago.idBoleta}</p>
      <p><strong>Total de la Boleta:</strong> ${quetzalFormatter.format(pago.cantidad)}</p>
      <p><strong>Cantidad Aplicada a esta Factura:</strong> ${quetzalFormatter.format(montoAplicado)}</p>
      <p><strong>Saldo:</strong> ${quetzalFormatter.format(pago.saldo || 0)}</p>
      <p><strong>Forma de Pago:</strong> ${pago.formaPago}</p>
      <p><strong>Banco:</strong> ${pago.banco}</p>
      <p><strong>Quién Deposito:</strong> ${pago.quienDeposito}</p>
      <p><strong>Fecha de Pago:</strong> ${pago.fechaPago}</p>
      <button onclick="abrirModalEditarPago('${pago.id}')">Editar</button>
      <button onclick="eliminarPago('${pago.id}')">Eliminar</button>
      <hr>
    `;
    listaPagosDiv.appendChild(pagoItem);
  });
}

// =========================
// Manejo de Selecciones
// =========================

function actualizarFacturasSeleccionadas() {
  const facturasSeleccionadas = obtenerFacturasSeleccionadas();
  const facturaDiv = document.getElementById('facturasSeleccionadas');
  if (!facturaDiv) return;
  facturaDiv.innerHTML = '';

  let totalPendiente = 0;
  facturasSeleccionadas.forEach(factura => {
    const montoPendiente = factura.montoFactura - calcularMontoPagadoSync(factura.id);
    facturaDiv.innerHTML += `<p>ID: ${factura.numeroFactura} - Total: ${quetzalFormatter.format(factura.montoFactura)} - Pendiente: ${quetzalFormatter.format(montoPendiente)}</p>`;
    totalPendiente += montoPendiente;
  });

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

  const cantidadInput = document.getElementById('cantidad');
  const saldoDisponibleDiv = document.getElementById('saldoDisponible');
  if (saldoDisponibleDiv) {
    if (cantidadInput && cantidadInput.value) {
      const cantidad = parseFloat(cantidadInput.value);
      saldoDisponibleDiv.innerHTML = `<p><strong>Saldo Disponible:</strong> ${cantidad > totalPendiente ? quetzalFormatter.format(cantidad - totalPendiente) : 'Q0.00'}</p>`;
    } else {
      saldoDisponibleDiv.innerHTML = `<p><strong>Saldo Disponible:</strong> Q0.00</p>`;
    }
  }
}

function obtenerFacturasSeleccionadas() {
  const seleccionados = [];
  const checkboxes = document.querySelectorAll('.select-factura:checked');
  checkboxes.forEach(cb => {
    const factura = facturas.find(f => f.id === cb.value);
    if (factura) seleccionados.push(factura);
  });
  return seleccionados;
}

function actualizarFilaSeleccionada(checkbox) {
  const row = checkbox.closest('tr');
  if (row) {
    if (checkbox.checked) {
      row.classList.add('selected-row');
    } else {
      row.classList.remove('selected-row');
    }
  }
  actualizarFacturasSeleccionadas();
}

// =========================
// Filtros
// =========================

function filtrarFacturas() {
  const searchInput = document.getElementById('searchInput').value.toLowerCase();
  const filterEmpresa = document.getElementById('filterEmpresa').value;
  const filterProveedor = document.getElementById('filterProveedor').value;
  const filterSucursal = document.getElementById('filterSucursal').value;
  const filterEstado = document.getElementById('filterEstado').value;
  const filterFechaInicio = document.getElementById('filterFechaInicio').value;
  const filterFechaFin = document.getElementById('filterFechaFin').value;
  const yearSelect = document.getElementById('yearSelect') ? document.getElementById('yearSelect').value : '';

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

    if (yearSelect) {
      const añoFactura = new Date(factura.fechaFactura).getFullYear();
      matchesFecha = matchesFecha && (añoFactura === parseInt(yearSelect));
    }

    return matchesSearch && matchesEmpresa && matchesProveedor && matchesSucursal && matchesEstado && matchesFecha;
  });

  mostrarFacturas(filteredFacturas);
}

function resetearFiltros() {
  const searchInput = document.getElementById('searchInput');
  const filterEmpresa = document.getElementById('filterEmpresa');
  const filterProveedor = document.getElementById('filterProveedor');
  const filterSucursal = document.getElementById('filterSucursal');
  const filterEstado = document.getElementById('filterEstado');
  const filterFechaInicio = document.getElementById('filterFechaInicio');
  const filterFechaFin = document.getElementById('filterFechaFin');
  const yearSelect = document.getElementById('yearSelect');

  if (searchInput) searchInput.value = '';
  if (filterEmpresa) filterEmpresa.value = '';
  if (filterProveedor) filterProveedor.value = '';
  if (filterSucursal) filterSucursal.value = '';
  if (filterEstado) filterEstado.value = '';
  if (filterFechaInicio) filterFechaInicio.value = '';
  if (filterFechaFin) filterFechaFin.value = '';
  if (yearSelect) yearSelect.value = '';

  mostrarFacturas(facturas);
}

// =========================
// Seleccionar/Deseleccionar Todas las Facturas
// =========================

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

// =========================
// Eventos Globales
// =========================

function agregarEventosGlobales() {
  window.onclick = function(event) {
    const modales = document.querySelectorAll('.modal');
    modales.forEach(modal => {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    });
  };

  const searchInput = document.getElementById('searchInput');
  const filterEmpresa = document.getElementById('filterEmpresa');
  const filterProveedor = document.getElementById('filterProveedor');
  const filterSucursal = document.getElementById('filterSucursal');
  const filterEstado = document.getElementById('filterEstado');
  const filterFechaInicio = document.getElementById('filterFechaInicio');
  const filterFechaFin = document.getElementById('filterFechaFin');
  const yearSelect = document.getElementById('yearSelect');

  if (searchInput) searchInput.addEventListener('input', filtrarFacturas);
  if (filterEmpresa) filterEmpresa.addEventListener('change', filtrarFacturas);
  if (filterProveedor) filterProveedor.addEventListener('change', filtrarFacturas);
  if (filterSucursal) filterSucursal.addEventListener('change', filtrarFacturas);
  if (filterEstado) filterEstado.addEventListener('change', filtrarFacturas);
  if (filterFechaInicio) filterFechaInicio.addEventListener('change', filtrarFacturas);
  if (filterFechaFin) filterFechaFin.addEventListener('change', filtrarFacturas);
  if (yearSelect) yearSelect.addEventListener('change', filtrarFacturas);

  // Cuando cambie el proveedor, recalcular la fecha de vencimiento si ya hay fecha de factura seleccionada
  const proveedorSelect = document.getElementById('proveedor');
  if (proveedorSelect) {
    proveedorSelect.addEventListener('change', function() {
      const fechaFactura = document.getElementById('fechaFactura').value;
      if (fechaFactura) {
        calcularFechaVencimiento();
      }
    });
  }
}

function calcularFechaVencimiento() {
  const proveedorId = document.getElementById('proveedor').value;
  const fechaFactura = document.getElementById('fechaFactura').value;
  if (proveedorId && fechaFactura) {
    const proveedor = proveedores.find(p => p.id === proveedorId);
    if (proveedor && proveedor.diasCredito) {
      const diasCredito = proveedor.diasCredito;
      const fechaFacturaDate = new Date(fechaFactura);
      fechaFacturaDate.setDate(fechaFacturaDate.getDate() + diasCredito);
      const fechaVencimiento = fechaFacturaDate.toISOString().split('T')[0];
      document.getElementById('fechaVencimiento').value = fechaVencimiento;
    }
  }
}

// =========================
// Cargar Datos Iniciales
// =========================

function agregarListenerCambioEmpresa() {
  const empresaSelect = document.getElementById('empresa');
  const sucursalSelect = document.getElementById('sucursal');

  if (empresaSelect && sucursalSelect) {
    empresaSelect.addEventListener('change', function() {
      poblarSelectSucursalModal();
    });
  }
}

function cargarDatosIniciales() {
  cargarEmpresas();
  cargarProveedores();
  cargarFacturas();
  cargarPagos();
  cargarAnios();
  agregarEventosGlobales();
  agregarListenerCambioEmpresa();
}

window.onload = function() {
  cargarDatosIniciales();
};

// =========================
// Cargar y Escuchar Cambios en Firestore
// =========================

function cargarEmpresas() {
  db.collection("empresas").get()
    .then(querySnapshot => {
      empresas = [];
      querySnapshot.forEach(doc => {
        empresas.push({ id: doc.id, ...doc.data() });
      });
      poblarSelectEmpresasFacturaModal();
      poblarSelectEmpresaFilter();
      poblarSelectSucursalFilter();
    })
    .catch(error => {
      console.error("Error al cargar empresas: ", error);
      Swal.fire('Error', 'Hubo un problema al cargar las empresas.', 'error');
    });
}

function cargarProveedores() {
  db.collection("proveedores").get()
    .then(querySnapshot => {
      proveedores = [];
      querySnapshot.forEach(doc => {
        proveedores.push({ id: doc.id, ...doc.data() });
      });
      poblarSelectProveedoresFacturaModal();
      poblarSelectProveedorFilter();
    })
    .catch(error => {
      console.error("Error al cargar proveedores: ", error);
      Swal.fire('Error', 'Hubo un problema al cargar los proveedores.', 'error');
    });
}

function cargarFacturas() {
  db.collection("facturas").onSnapshot(snapshot => {
    facturas = [];
    snapshot.forEach(doc => {
      facturas.push({ id: doc.id, ...doc.data() });
    });
    filtrarFacturas();
  }, error => {
    console.error("Error al cargar facturas: ", error);
    Swal.fire('Error', 'Hubo un problema al cargar las facturas.', 'error');
  });
}

function cargarPagos() {
  db.collection("pagos").onSnapshot(snapshot => {
    pagos = [];
    snapshot.forEach(doc => {
      pagos.push({ id: doc.id, ...doc.data() });
    });
    poblarSelectBoletasConSaldo();
    cargarBoletasConSaldo();
  }, error => {
    console.error("Error al cargar pagos: ", error);
    Swal.fire('Error', 'Hubo un problema al cargar los pagos.', 'error');
  });
}

function cargarAnios() {
  const yearSelect = document.getElementById('yearSelect');
  if (!yearSelect) return;
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 2000; y--) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    yearSelect.appendChild(option);
  }
}

// =========================
// Aplicar Boleta (Confirmación de Monto a Aplicar)
// =========================

function abrirModalAplicarBoleta(boletaId) {
  const aplicarBoletaModal = document.getElementById('aplicarBoletaModal');
  if (!aplicarBoletaModal) return;

  const boletaSeleccionada = pagos.find(p => p.id === boletaId && p.saldo > 0);
  if (!boletaSeleccionada) {
    Swal.fire('Error', 'No se encontró la boleta seleccionada o no tiene saldo disponible.', 'error');
    return;
  }

  if (!boletaSeleccionada.facturasIds || boletaSeleccionada.facturasIds.length === 0) {
    Swal.fire('Error', 'La boleta no tiene facturas originales asociadas, no se puede determinar empresa/proveedor.', 'error');
    return;
  }

  const facturaOriginalId = boletaSeleccionada.facturasIds[0];
  const facturaOriginal = facturas.find(f => f.id === facturaOriginalId);

  if (!facturaOriginal) {
    Swal.fire('Error', 'No se encontró la factura original de la boleta. No se puede continuar.', 'error');
    return;
  }

  const facturasPendientes = facturas.filter(f => 
    f.empresaId === facturaOriginal.empresaId &&
    f.proveedorId === facturaOriginal.proveedorId &&
    (f.estado === 'Pendiente' || f.estado === 'Pagado Parcialmente')
  );

  const boletaInfoDiv = document.getElementById('boletaSeleccionadaInfo');
  boletaInfoDiv.innerHTML = `
    <p><strong>ID Boleta:</strong> ${boletaSeleccionada.idBoleta}</p>
    <p><strong>Saldo Disponible:</strong> ${quetzalFormatter.format(boletaSeleccionada.saldo)}</p>
  `;
  boletaInfoDiv.setAttribute('data-boleta-id', boletaSeleccionada.id);

  const facturasPendientesDiv = document.getElementById('facturasPendientes');
  facturasPendientesDiv.innerHTML = '';

  if (facturasPendientes.length === 0) {
    facturasPendientesDiv.innerHTML = '<p>No hay facturas pendientes o parcialmente pagadas que coincidan con la empresa y proveedor.</p>';
  } else {
    facturasPendientes.forEach(fact => {
      const montoPendiente = fact.montoFactura - calcularMontoPagadoSync(fact.id);
      const facturaItem = document.createElement('div');
      facturaItem.innerHTML = `
        <label>
          <input type="radio" name="facturaSeleccionada" value="${fact.id}">
          Factura: ${fact.numeroFactura} | Monto Pendiente: ${quetzalFormatter.format(montoPendiente)}
        </label>
      `;
      facturasPendientesDiv.appendChild(facturaItem);
    });
  }

  aplicarBoletaModal.style.display = 'block';
}

document.getElementById('aplicarBoletaForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const montoAplicacion = parseFloat(document.getElementById('montoAplicacion').value);
  const facturaSeleccionadaId = document.querySelector('input[name="facturaSeleccionada"]:checked') ?
    document.querySelector('input[name="facturaSeleccionada"]:checked').value : null;

  if (!facturaSeleccionadaId || isNaN(montoAplicacion) || montoAplicacion <= 0) {
    Swal.fire('Error', 'Selecciona una factura y un monto válido para aplicar.', 'error');
    return;
  }

  const boletaId = document.getElementById('boletaSeleccionadaInfo').getAttribute('data-boleta-id');
  const boletaSeleccionada = pagos.find(p => p.id === boletaId && p.saldo > 0);
  if (!boletaSeleccionada) {
    Swal.fire('Error', 'No se encontró la boleta seleccionada o no tiene saldo disponible.', 'error');
    return;
  }

  if (montoAplicacion > boletaSeleccionada.saldo) {
    Swal.fire('Error', 'El monto a aplicar excede el saldo disponible de la boleta.', 'error');
    return;
  }

  const facturaAplicar = facturas.find(f => f.id === facturaSeleccionadaId);
  if (!facturaAplicar) {
    Swal.fire('Error', 'No se encontró la factura seleccionada.', 'error');
    return;
  }

  const facturaOriginal = facturas.find(f => f.id === boletaSeleccionada.facturasIds[0]);
  if (!facturaOriginal) {
    Swal.fire('Error', 'No se pudo validar empresa y proveedor.', 'error');
    return;
  }

  if (facturaOriginal.empresaId !== facturaAplicar.empresaId || facturaOriginal.proveedorId !== facturaAplicar.proveedorId) {
    Swal.fire('Error', 'La factura seleccionada no pertenece a la misma empresa o proveedor.', 'error');
    return;
  }

  const montoPendienteFactura = facturaAplicar.montoFactura - calcularMontoPagadoSync(facturaAplicar.id);
  if (montoAplicacion > montoPendienteFactura) {
    Swal.fire('Error', `El monto a aplicar excede el monto pendiente de la factura (${quetzalFormatter.format(montoPendienteFactura)}).`, 'error');
    return;
  }

  // Confirmación antes de aplicar
  Swal.fire({
    title: 'Confirmar Aplicación',
    text: `Se aplicarán ${quetzalFormatter.format(montoAplicacion)} a la factura ${facturaAplicar.numeroFactura}. ¿Deseas continuar?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, aplicar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      const pagoRef = db.collection("pagos").doc(boletaSeleccionada.id);
      const nuevosMontosAplicados = { ...boletaSeleccionada.montosAplicados };
      const nuevasFacturasIds = [...boletaSeleccionada.facturasIds];

      if (!nuevosMontosAplicados[facturaSeleccionadaId]) {
        nuevosMontosAplicados[facturaSeleccionadaId] = 0;
        if (!nuevasFacturasIds.includes(facturaSeleccionadaId)) {
          nuevasFacturasIds.push(facturaSeleccionadaId);
        }
      }

      nuevosMontosAplicados[facturaSeleccionadaId] += montoAplicacion;
      const nuevoSaldo = boletaSeleccionada.saldo - montoAplicacion;

      pagoRef.update({
        montosAplicados: nuevosMontosAplicados,
        facturasIds: nuevasFacturasIds,
        saldo: nuevoSaldo
      })
      .then(() => {
        actualizarEstadoFactura(facturaSeleccionadaId);
        Swal.fire('Éxito', `Se aplicaron ${quetzalFormatter.format(montoAplicacion)} a la factura ${facturaAplicar.numeroFactura}.`, 'success');
        document.getElementById('montoAplicacion').value = '';
      })
      .catch(error => {
        console.error('Error al aplicar boleta:', error);
        Swal.fire('Error', 'Hubo un problema al aplicar la boleta.', 'error');
      });
    }
  });
});
