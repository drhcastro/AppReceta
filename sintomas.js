document.addEventListener('DOMContentLoaded', () => {
    const patientCode = localStorage.getItem('patientCode');
    if (!patientCode) {
        alert('Código de paciente no encontrado. Vuelva a la página principal.');
        window.location.href = 'app.html';
        return;
    }

    const sintomasTipoSelect = document.getElementById('sintoma-tipo');
    const sintomaOtroInput = document.getElementById('sintoma-otro');
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

    let sintomasRegistrados = cargarRegistros('sintomas', patientCode) || [];
    let fiebreRegistrada = cargarRegistros('fiebre', patientCode) || [];

    mostrarSintomas();
    mostrarFiebre();
    renderizarGraficaFiebre();

    sintomasTipoSelect.addEventListener('change', () => {
        sintomaOtroInput.style.display = sintomasTipoSelect.value === 'otro' ? 'block' : 'none';
    });

    fiebreAccionSelect.addEventListener('change', () => {
        fiebreAccionDetalleDiv.style.display = fiebreAccionSelect.value === 'medicamento' || fiebreAccionSelect.value === 'medios_fisicos' ? 'block' : 'none';
    });

    guardarSintomaBtn.addEventListener('click', () => {
        const tipo = sintomasTipoSelect.value === 'otro' ? sintomaOtroInput.value.trim() : sintomasTipoSelect.value;
        const hora = document.getElementById('sintoma-hora').value;
        const descripcion = document.getElementById('sintoma-descripcion').value.trim();
        const fijado = document.getElementById('sintoma-fijar').checked;

        if (tipo) {
            sintomasRegistrados.push({ tipo, hora, descripcion, fijado });
            guardarRegistros('sintomas', patientCode, sintomasRegistrados);
            mostrarSintomas();
            limpiarFormularioSintomas();
        } else {
            alert('Por favor, seleccione o escriba un síntoma.');
        }
    });

    guardarFiebreBtn.addEventListener('click', () => {
        const hora = fiebreHoraInput.value;
        const temperatura = parseFloat(fiebreTemperaturaInput.value);
        const accion = fiebreAccionSelect.value;
        const detalle = fiebreAccionDetalleDiv.style.display === 'block' ? fiebreDetalleInput.value.trim() : '';

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
        link.href = fiebreChartCanvas.toDataURL();
        link.click();
    });

    regresarMedicamentosBtn.addEventListener('click', () => {
        window.location.href = 'app.html';
    });

    function cargarRegistros(tipo, patientCode) {
        const key = `registros_${tipo}_${patientCode}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    function guardarRegistros(tipo, patientCode, registros) {
        const key = `registros_${tipo}_${patientCode}`;
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
            div.classList.add('sintoma-item');
            div.innerHTML = `
                <div class="registro-detalles">
                    <strong>${sintoma.tipo}</strong> - Hora: ${sintoma.hora}<br>
                    Descripción: ${sintoma.descripcion || 'Sin descripción'}
                    ${sintoma.fijado ? '<span class="registro-fijado">(Fijado)</span>' : ''}
                </div>
                <div class="registro-acciones">
                    ${sintoma.fijado ? '' : `<button onclick="editarSintoma(${index})">Editar</button> <button onclick="eliminarSintoma(${index})">Eliminar</button>`}
                </div>
            `;
            sintomasListaDiv.appendChild(div);
        });
    }

    window.editarSintoma = (index) => {
        const sintoma = sintomasRegistradosPrompt("Editar síntoma:", sintomasRegistrados\[index]);
        if (sintoma) {
            sintomasRegistrados\[index] = { ...sintomasRegistrados\[index], ...sintoma };
            guardarRegistros('sintomas', patientCode, sintomasRegistrados);
            mostrarSintomas();
        }
    };

    window.eliminarSintoma = (index) => {
        if (confirm('¿Seguro que desea eliminar este síntoma?')) {
            sintomasRegistrados.splice(index, 1);
            guardarRegistros('sintomas', patientCode, sintomasRegistrados);
            mostrarSintomas();
        }
    };

    function sintomasRegistradosPrompt(title, existingData = {}) {
        let tipo = prompt(title + "\\nSíntoma (dejar en blanco para mantener):", existingData.tipo || "");
        if (tipo === null) return null;
        if (tipo === "") tipo = existingData.tipo;
        let hora = prompt("Hora (dejar en blanco para mantener):", existingData.hora || "");
        if (hora === null) return null;
        if (hora === "") hora = existingData.hora;
        let descripcion = prompt("Descripción (dejar en blanco para mantener):", existingData.descripcion || "");
        if (descripcion === null) return null;
        if (descripcion === "") descripcion = existingData.descripcion;
        return { tipo, hora, descripcion };
    }

    function mostrarFiebre() {
        fiebreListaDiv.innerHTML = '<h3>Registro de Temperatura</h3>';
        if (fiebreRegistrada.length === 0) {
            fiebreListaDiv.innerHTML += '<p>No hay registros de temperatura.</p>';
            return;
        }
        fiebreRegistrada.sort((a, b) => new Date(`2000/01/01 ${a.hora}`) - new Date(`2000/01/01 ${b.hora}`));
        fiebreRegistrada.forEach((registro, index) => {
            const div = document.createElement('div');
            div.classList.add('fiebre-item');
            div.innerHTML = `
                <div class="registro-detalles">
                    Hora: ${registro.hora} - Temperatura: ${registro.temperatura} °C<br>
                    Acción: ${registro.accion === 'medicamento' ? 'Medicamento: ' + registro.detalle : (registro.accion === 'medios_fisicos' ? 'Medios físicos: ' + registro.detalle : registro.accion)}
                </div>
                <div class="registro-acciones">
                    <button onclick="eliminarFiebre(${index})">Eliminar</button>
                </div>
            `;
            fiebreListaDiv.appendChild(div);
        });
    }

    window.eliminarFiebre = (index) => {
        if (confirm('¿Seguro que desea eliminar este registro de fiebre?')) {
            fiebreRegistrada.splice(index, 1);
            guardarRegistros('fiebre', patientCode, fiebreRegistrada);
            mostrarFiebre();
            renderizarGraficaFiebre();
        }
    };

    function renderizarGraficaFiebre() {
        const horas = fiebreRegistrada.map(r => r.hora);
        const temperaturas = fiebreRegistrada.map(r => r.temperatura);

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
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 35,
                        max: 41,
                        ticks: {
                            stepSize: 0.5
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Historial de Temperatura',
                        padding: {
                            bottom: 10
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function limpiarFormularioSintomas() {
        sintomasTipoSelect.value = '';
        sintomaOtroInput.style.display = 'none';
        sintomaOtroInput.value = '';
        document.getElementById('sintoma-hora').value = '';
        document.getElementById('sintoma-descripcion').value = '';
        document.getElementById('sintoma-fijar').checked = false;
    }

    function limpiarFormularioFiebre() {
        fiebreHoraInput.value = '';
        fiebreTemperaturaInput.value = '';
        fiebreAccionSelect.value = 'ninguna';
        fiebreAccionDetalleDiv.style.display = 'none';
        fiebreDetalleInput.value = '';
    }
});
