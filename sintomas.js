document.addEventListener('DOMContentLoaded', () => {
    const patientCode = localStorage.getItem('patientCode');
    if (!patientCode) {
        alert('Código de paciente no encontrado. Vuelva a la página principal.');
        window.location.href = 'app.html';
        return;
    }

    // --- Selectores de Elementos ---
    const sintomasTipoSelect = document.getElementById('sintoma-tipo');
    const sintomaOtroInput = document.getElementById('sintoma-otro');
    const sintomaHoraInput = document.getElementById('sintoma-hora');
    const sintomaDescripcionInput = document.getElementById('sintoma-descripcion');
    const sintomaFijarCheckbox = document.getElementById('sintoma-fijar');
    const guardarSintomaBtn = document.getElementById('guardar-sintoma');
    const sintomasListaDiv = document.getElementById('sintomas-lista');

    const fiebreHoraInput = document.getElementById('fiebre-hora');
    const fiebreTemperaturaInput = document.getElementById('fiebre-temperatura');
    const fiebreAccionSelect = document.getElementById('fiebre-accion');
    const fiebreAccionDetalleDiv = document.getElementById('fiebre-accion-detalle');
    const fiebreDetalleInput = document.getElementById('fiebre-detalle-input');
    const guardarFiebreBtn = document.getElementById('guardar-fiebre');
    const fiebreListaDiv = document.getElementById('fiebre-lista');

    const fiebreChartCanvas = document.getElementById('fiebreChart');
    const guardarGraficaImagenBtn = document.getElementById('guardar-grafica-imagen');
    const regresarMedicamentosBtn = document.getElementById('regresar-medicamentos');

    // --- Carga de Datos y Estado ---
    let sintomasRegistrados = cargarRegistros('sintomas', patientCode) || [];
    let fiebreRegistrada = cargarRegistros('fiebre', patientCode) || [];
    let indiceEditando = null; // Para saber si estamos editando un síntoma

    // --- Renderizado Inicial ---
    mostrarSintomas();
    mostrarFiebre();
    renderizarGraficaFiebre();

    // --- Lógica de Eventos ---
    sintomasTipoSelect.addEventListener('change', () => {
        sintomaOtroInput.style.display = sintomasTipoSelect.value === 'otro' ? 'block' : 'none';
    });

    fiebreAccionSelect.addEventListener('change', () => {
        fiebreAccionDetalleDiv.style.display = ['medicamento', 'medios_fisicos'].includes(fiebreAccionSelect.value) ? 'block' : 'none';
    });

    guardarSintomaBtn.addEventListener('click', () => {
        const tipo = sintomasTipoSelect.value === 'otro' ? sintomaOtroInput.value.trim() : sintomasTipoSelect.value;
        const hora = sintomaHoraInput.value;
        const descripcion = sintomaDescripcionInput.value.trim();
        const fijado = sintomaFijarCheckbox.checked;

        if (!tipo) {
            alert('Por favor, seleccione o escriba un síntoma.');
            return;
        }

        const nuevoSintoma = { tipo, hora, descripcion, fijado };

        if (indiceEditando !== null) {
            // Actualizar síntoma existente
            sintomasRegistrados[indiceEditando] = nuevoSintoma;
            indiceEditando = null; // Salir del modo edición
            guardarSintomaBtn.textContent = 'Guardar Síntoma';
        } else {
            // Guardar nuevo síntoma
            sintomasRegistrados.push(nuevoSintoma);
        }

        guardarRegistros('sintomas', patientCode, sintomasRegistrados);
        mostrarSintomas();
        limpiarFormularioSintomas();
    });

    guardarFiebreBtn.addEventListener('click', () => {
        const hora = fiebreHoraInput.value;
        const temperatura = parseFloat(fiebreTemperaturaInput.value);
        const accion = fiebreAccionSelect.value;
        const detalle = ['medicamento', 'medios_fisicos'].includes(accion) ? fiebreDetalleInput.value.trim() : '';

        if (!isNaN(temperatura) && temperatura >= 35 && temperatura <= 41) {
            fiebreRegistrada.push({ hora, temperatura, accion, detalle });
            guardarRegistros('fiebre', patientCode, fiebreRegistrada);
            mostrarFiebre();
            renderizarGraficaFiebre();
            limpiarFormularioFiebre();
        } else {
            alert('Por favor, ingrese una temperatura válida (35.0 - 41.0 °C).');
        }
    });

    guardarGraficaImagenBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `Grafica_Fiebre_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = fiebreChartCanvas.toDataURL('image/png', 1.0);
        link.click();
    });

    regresarMedicamentosBtn.addEventListener('click', () => {
        window.location.href = 'app.html';
    });

    // --- Funciones de Ayuda ---
    function cargarRegistros(tipo, code) {
        const key = `registros_${tipo}_${code}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function guardarRegistros(tipo, code, registros) {
        const key = `registros_${tipo}_${code}`;
        localStorage.setItem(key, JSON.stringify(registros));
    }

    function mostrarSintomas() {
        sintomasListaDiv.innerHTML = '<h3>Síntomas Registrados</h3>';
        if (sintomasRegistrados.length === 0) {
            sintomasListaDiv.innerHTML += '<p>No hay síntomas registrados.</p>';
            return;
        }
        sintomasRegistrados.forEach((sintoma, index) => {
            const div = document.createElement('div');
            div.className = 'sintoma-item';
            div.innerHTML = `
                <div class="registro-detalles">
                    <strong>${sintoma.tipo}</strong> - Hora: ${sintoma.hora || 'N/A'}<br>
                    Descripción: ${sintoma.descripcion || 'Sin descripción'}
                    ${sintoma.fijado ? '<span class="registro-fijado"> (Fijado)</span>' : ''}
                </div>
                <div class="registro-acciones">
                    ${sintoma.fijado ? '' : `<button data-index="${index}" class="edit-sintoma-btn">Editar</button> <button data-index="${index}" class="delete-sintoma-btn">Eliminar</button>`}
                </div>
            `;
            sintomasListaDiv.appendChild(div);
        });
    }

    sintomasListaDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-sintoma-btn')) {
            cargarSintomaParaEdicion(parseInt(e.target.dataset.index));
        }
        if (e.target.classList.contains('delete-sintoma-btn')) {
            eliminarSintoma(parseInt(e.target.dataset.index));
        }
    });

    function cargarSintomaParaEdicion(index) {
        const sintoma = sintomasRegistrados[index];
        const esOtro = !['diarrea', 'tos', 'vomito'].includes(sintoma.tipo);

        if (esOtro) {
            sintomasTipoSelect.value = 'otro';
            sintomaOtroInput.style.display = 'block';
            sintomaOtroInput.value = sintoma.tipo;
        } else {
            sintomasTipoSelect.value = sintoma.tipo;
            sintomaOtroInput.style.display = 'none';
            sintomaOtroInput.value = '';
        }

        sintomaHoraInput.value = sintoma.hora;
        sintomaDescripcionInput.value = sintoma.descripcion;
        sintomaFijarCheckbox.checked = sintoma.fijado;
        
        guardarSintomaBtn.textContent = 'Actualizar Síntoma';
        indiceEditando = index;
    }

    function eliminarSintoma(index) {
        if (confirm('¿Seguro que desea eliminar este síntoma?')) {
            sintomasRegistrados.splice(index, 1);
            guardarRegistros('sintomas', patientCode, sintomasRegistrados);
            mostrarSintomas();
        }
    }

    function mostrarFiebre() {
        fiebreListaDiv.innerHTML = '<h3>Registro de Temperatura</h3>';
        if (fiebreRegistrada.length === 0) {
            fiebreListaDiv.innerHTML += '<p>No hay registros de temperatura.</p>';
            return;
        }
        const registrosOrdenados = [...fiebreRegistrada].sort((a, b) => (a.hora > b.hora) ? 1 : -1);
        registrosOrdenados.forEach((registro, originalIndex) => {
            const div = document.createElement('div');
            div.className = 'fiebre-item';
            div.innerHTML = `
                <div class="registro-detalles">
                    Hora: ${registro.hora} - <strong>${registro.temperatura}°C</strong><br>
                    Acción: ${registro.accion.replace('_', ' ')} ${registro.detalle ? `(${registro.detalle})` : ''}
                </div>
                <div class="registro-acciones">
                    <button class="delete-fiebre-btn" data-hora="${registro.hora}" data-temp="${registro.temperatura}">Eliminar</button>
                </div>
            `;
            fiebreListaDiv.appendChild(div);
        });
    }

    fiebreListaDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-fiebre-btn')) {
            const hora = e.target.dataset.hora;
            const temp = parseFloat(e.target.dataset.temp);
            eliminarFiebre(hora, temp);
        }
    });

    function eliminarFiebre(hora, temp) {
        if (confirm('¿Seguro que desea eliminar este registro de fiebre?')) {
            fiebreRegistrada = fiebreRegistrada.filter(r => r.hora !== hora || r.temperatura !== temp);
            guardarRegistros('fiebre', patientCode, fiebreRegistrada);
            mostrarFiebre();
            renderizarGraficaFiebre();
        }
    }

    function renderizarGraficaFiebre() {
        // Destruye la gráfica anterior si existe para evitar duplicados
        let chartStatus = Chart.getChart("fiebreChart"); 
        if (chartStatus != undefined) {
          chartStatus.destroy();
        }

        const registrosOrdenados = [...fiebreRegistrada].sort((a, b) => (a.hora > b.hora) ? 1 : -1);
        const horas = registrosOrdenados.map(r => r.hora);
        const temperaturas = registrosOrdenados.map(r => r.temperatura);

        new Chart(fiebreChartCanvas, {
            type: 'line',
            data: {
                labels: horas,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: temperaturas,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 35.0,
                        max: 41.0,
                        ticks: { stepSize: 0.5 }
                    }
                }
            }
        });
    }

    function limpiarFormularioSintomas() {
        sintomasTipoSelect.value = '';
        sintomaOtroInput.style.display = 'none';
        sintomaOtroInput.value = '';
        sintomaHoraInput.value = '';
        sintomaDescripcionInput.value = '';
        sintomaFijarCheckbox.checked = false;
        guardarSintomaBtn.textContent = 'Guardar Síntoma';
        indiceEditando = null;
    }

    function limpiarFormularioFiebre() {
        fiebreHoraInput.value = '';
        fiebreTemperaturaInput.value = '';
        fiebreAccionSelect.value = 'ninguna';
        fiebreAccionDetalleDiv.style.display = 'none';
        fiebreDetalleInput.value = '';
    }
});
