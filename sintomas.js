document.addEventListener('DOMContentLoaded', () => {
    // --- Comprobación Inicial ---
    const patientCode = localStorage.getItem('patientCode');
    if (!patientCode) {
        alert('Código de paciente no encontrado. Por favor, regrese a la página principal.');
        window.location.href = 'app.html';
        return;
    }

    // --- Selectores de Elementos ---
    const sintomaForm = document.getElementById('sintoma-form');
    const fiebreForm = document.getElementById('fiebre-form');
    const guardarSintomaBtn = document.getElementById('guardar-sintoma');
    const guardarFiebreBtn = document.getElementById('guardar-fiebre');
    const guardarGraficaImagenBtn = document.getElementById('guardar-grafica-imagen');
    const guardarRegistrosImagenBtn = document.getElementById('guardar-registros-imagen');
    const regresarMedicamentosBtn = document.getElementById('regresar-medicamentos');
    const sintomasListaDiv = document.getElementById('sintomas-lista');
    const fiebreListaDiv = document.getElementById('fiebre-lista');
    const fiebreChartCanvas = document.getElementById('fiebreChart').getContext('2d');
    const sintomasTipoSelect = document.getElementById('sintoma-tipo');
    const sintomaOtroInput = document.getElementById('sintoma-otro');
    const fiebreAccionSelect = document.getElementById('fiebre-accion');
    const fiebreAccionDetalleDiv = document.getElementById('fiebre-accion-detalle');

    // --- Estado de la Aplicación ---
    let sintomasRegistrados = JSON.parse(localStorage.getItem(`sintomas_${patientCode}`)) || [];
    let fiebreRegistrada = JSON.parse(localStorage.getItem(`fiebre_${patientCode}`)) || [];
    let chartInstance = null; // Para mantener una referencia a la gráfica

    // --- Lógica de Eventos ---
    regresarMedicamentosBtn.addEventListener('click', () => {
        window.location.href = 'app.html';
    });

    sintomasTipoSelect.addEventListener('change', () => {
        sintomaOtroInput.style.display = (sintomasTipoSelect.value === 'otro') ? 'block' : 'none';
    });

    fiebreAccionSelect.addEventListener('change', () => {
        const showDetail = ['Medicamento', 'Medios Físicos'].includes(fiebreAccionSelect.value);
        fiebreAccionDetalleDiv.style.display = showDetail ? 'block' : 'none';
    });

    guardarSintomaBtn.addEventListener('click', () => {
        const tipo = (sintomasTipoSelect.value === 'otro') ? document.getElementById('sintoma-otro').value.trim() : sintomasTipoSelect.value;
        const hora = document.getElementById('sintoma-hora').value;
        const descripcion = document.getElementById('sintoma-descripcion').value.trim();
        const fijado = document.getElementById('sintoma-fijar').checked;

        if (!tipo) {
            alert('Por favor, seleccione o especifique un síntoma.');
            return;
        }

        sintomasRegistrados.push({ tipo, hora, descripcion, fijado, id: Date.now() });
        localStorage.setItem(`sintomas_${patientCode}`, JSON.stringify(sintomasRegistrados));
        renderSintomas();
        sintomaForm.reset();
        sintomaOtroInput.style.display = 'none';
    });

    guardarFiebreBtn.addEventListener('click', () => {
        const hora = document.getElementById('fiebre-hora').value;
        const temperatura = parseFloat(document.getElementById('fiebre-temperatura').value);
        const accion = document.getElementById('fiebre-accion').value;
        const detalle = document.getElementById('fiebre-detalle-input').value.trim();

        if (!hora || isNaN(temperatura) || temperatura < 35.0 || temperatura > 41.0) {
            alert('Por favor, ingrese una hora y una temperatura válida (entre 35.0 y 41.0).');
            return;
        }

        fiebreRegistrada.push({ hora, temperatura, accion, detalle, id: Date.now() });
        localStorage.setItem(`fiebre_${patientCode}`, JSON.stringify(fiebreRegistrada));
        renderFiebre();
        renderGrafica();
        fiebreForm.reset();
        fiebreAccionDetalleDiv.style.display = 'none';
    });
    
    guardarGraficaImagenBtn.addEventListener('click', () => {
        if (chartInstance && fiebreRegistrada.length > 0) {
            const link = document.createElement('a');
            link.href = chartInstance.toBase64Image('image/png', 1.0);
            link.download = `grafica-fiebre-${patientCode}.png`;
            link.click();
        } else {
            alert('No hay datos en la gráfica para guardar.');
        }
    });

    guardarRegistrosImagenBtn.addEventListener('click', () => {
        const containerToCapture = document.querySelector('.container');
        const buttonsToHide = document.querySelector('.button-container');

        // Oculta los botones para que no salgan en la imagen
        buttonsToHide.style.display = 'none';

        html2canvas(containerToCapture, {
            useCORS: true,
            backgroundColor: '#f4f4f4' // Color de fondo de la página
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Registro_Sintomas_${patientCode}_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();

            // Vuelve a mostrar los botones después de tomar la captura
            buttonsToHide.style.display = 'block';
        });
    });

    // --- Funciones de Renderizado ---
    function renderSintomas() {
        sintomasListaDiv.innerHTML = '<h3>Síntomas Registrados</h3>';
        if (sintomasRegistrados.length === 0) {
            sintomasListaDiv.innerHTML += '<p>No hay síntomas registrados.</p>';
            return;
        }
        sintomasRegistrados.forEach(sintoma => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'sintoma-item';
            itemDiv.innerHTML = `
                <div class="registro-detalles">
                    <strong>${sintoma.tipo}</strong> - ${sintoma.hora || 'sin hora'}<br>
                    <small>${sintoma.descripcion || 'Sin descripción.'}</small>
                    ${sintoma.fijado ? '<span class="registro-fijado"> (Fijado)</span>' : ''}
                </div>
                ${!sintoma.fijado ? `<div class="registro-acciones"><button class="delete-sintoma-btn" data-id="${sintoma.id}">Eliminar</button></div>` : ''}
            `;
            sintomasListaDiv.appendChild(itemDiv);
        });
    }

    function renderFiebre() {
        fiebreListaDiv.innerHTML = '<h3>Registro de Temperatura</h3>';
        const registrosOrdenados = [...fiebreRegistrada].sort((a, b) => a.hora.localeCompare(b.hora));
        
        if (registrosOrdenados.length === 0) {
            fiebreListaDiv.innerHTML += '<p>No hay registros de temperatura.</p>';
            return;
        }
        registrosOrdenados.forEach(registro => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'fiebre-item';
            itemDiv.innerHTML = `
                <div class="registro-detalles">
                    <strong>${registro.hora}</strong> - ${registro.temperatura.toFixed(1)}°C<br>
                    <small>Acción: ${registro.accion} ${registro.detalle ? `(${registro.detalle})` : ''}</small>
                </div>
                <div class="registro-acciones"><button class="delete-fiebre-btn" data-id="${registro.id}">Eliminar</button></div>
            `;
            fiebreListaDiv.appendChild(itemDiv);
        });
    }

    function renderGrafica() {
        if (chartInstance) {
            chartInstance.destroy();
        }
        const registrosOrdenados = [...fiebreRegistrada].sort((a, b) => a.hora.localeCompare(b.hora));
        const labels = registrosOrdenados.map(r => r.hora);
        const data = registrosOrdenados.map(r => r.temperatura);

        chartInstance = new Chart(fiebreChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: data,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 35.0,
                        max: 41.0,
                        ticks: { stepSize: 0.5 }
                    }
                }
            }
        });
    }

    // --- Lógica para Eliminar (usando event delegation) ---
    sintomasListaDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-sintoma-btn')) {
            const idParaEliminar = parseInt(e.target.dataset.id, 10);
            if (confirm('¿Está seguro de que desea eliminar este síntoma?')) {
                sintomasRegistrados = sintomasRegistrados.filter(s => s.id !== idParaEliminar);
                localStorage.setItem(`sintomas_${patientCode}`, JSON.stringify(sintomasRegistrados));
                renderSintomas();
            }
        }
    });

    fiebreListaDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-fiebre-btn')) {
            const idParaEliminar = parseInt(e.target.dataset.id, 10);
            if (confirm('¿Está seguro de que desea eliminar este registro de fiebre?')) {
                fiebreRegistrada = fiebreRegistrada.filter(r => r.id !== idParaEliminar);
                localStorage.setItem(`fiebre_${patientCode}`, JSON.stringify(fiebreRegistrada));
                renderFiebre();
                renderGrafica();
            }
        }
    });

    // --- Renderizado Inicial ---
    renderSintomas();
    renderFiebre();
    renderGrafica();
});
