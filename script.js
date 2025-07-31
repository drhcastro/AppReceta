// script.js (Versión Final Corregida)

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCh0jOiaAGNdoytpJ1sU8W-tJHO6ef1Mmgu4JpMA7oU3KvAvWNmioFlLJ4XzHH_Tgk1-wPAvpw7YaM/pub?gid=0&single=true&output=csv';

async function fetchData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) { throw new Error('Error al cargar la base de datos.'); }
        const text = await response.text();
        return Papa.parse(text, { header: true }).data;
    } catch (error) {
        console.error('Error en fetchData:', error);
        return null;
    }
}

async function loadPatientData() {
    const loader = document.getElementById('loader');
    const patientCode = localStorage.getItem('patientCode');
    
    if (!patientCode) {
        loader.textContent = 'Error: No se encontró código de paciente. Por favor, vuelve a la página de inicio.';
        return;
    }

    const data = await fetchData();
    if (!data) {
        loader.textContent = 'No se pudieron cargar los datos.';
        return;
    }

    const patientData = data.find(row => row.codigo_unico && row.codigo_unico.trim().toUpperCase() === patientCode);

    if (patientData) {
        loader.style.display = 'none';
        displayPatientInfo(patientData);
        displayMedications(patientData);
        setupActionButtons(patientData);
        setupDynamicEventListeners();
        setupLogoutButton();
    } else {
        loader.textContent = `Código "${patientCode}" no encontrado. Verifica que sea correcto.`;
    }
}

function displayPatientInfo(data) {
    const infoSection = document.getElementById('patient-info');
    infoSection.innerHTML = `
        <h2 id="patient-name">${data.nombre_completo || 'N/A'}</h2>
        <p><strong>Fecha de Nacimiento:</strong> <span id="patient-dob">${data.fecha_nacimiento || 'N/A'}</span></p>
        <p><strong>Edad:</strong> <span id="patient-age">${calculateAge(data.fecha_nacimiento)}</span></p>
        <p><strong>Peso:</strong> <span id="patient-weight">${data.peso_kg || 'N/A'} kg</span></p>
        <p><strong>Fecha Actual:</strong> <span id="current-date">${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
        <p id="patient-allergies" class="allergies" style="display: ${data.alergias ? 'block' : 'none'}">${data.alergias ? `ALERGIAS: ${data.alergias}` : ''}</p>
    `;
    infoSection.style.display = 'block';

    const diagnosisSection = document.getElementById('diagnosis-section');
    diagnosisSection.innerHTML = `<h3>Diagnóstico</h3><p id="patient-diagnosis">${data.diagnostico || 'No especificado.'}</p>`;
    diagnosisSection.style.display = 'block';

    const indicationsSection = document.getElementById('doctor-indications-section');
    if (data.indicaciones_medico && data.indicaciones_medico.trim() !== '') {
        indicationsSection.innerHTML = `<h3>Indicaciones de tu Médico</h3><p id="doctor-indications">${data.indicaciones_medico}</p>`;
        indicationsSection.style.display = 'block';
    } else {
        indicationsSection.style.display = 'none';
    }
}

function displayMedications(data) {
    const container = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    let allMedicationsHTML = [];
    let medicationCount = 0;

    for (let i = 1; i <= 15; i++) { // Aumentado a 15 por si acaso
        if (data[`med${i}_generico`] && data[`med${i}_generico`].trim() !== '') {
            medicationCount++;
            const medId = `med${i}`;
            const med = {
                generico: data[`med${i}_generico`],
                comercial: data[`med${i}_comercial`],
                frecuencia: data[`med${i}_frecuencia`],
                duracion: data[`med${i}_duracion`],
                presentacion: data[`med${i}_presentacion`],
                concentracion: data[`med${i}_concentracion`],
                surtir: data[`med${i}_surtir`],
                via: data[`med${i}_via`],
                dosis: data[`med${i}_dosis`],
                indicaciones: data[`med${i}_indicaciones`],
                fecha_indicacion: data[`med${i}_fecha_indicacion`]
            };

            let scheduleHTML = '';
            const frequencyString = med.frecuencia || '';
            const match = frequencyString.match(/(\d+)/);
            if (match) {
                const hours = parseInt(match[1], 10);
                const numberOfInputs = (hours > 0 && hours < 24) ? Math.floor(24 / hours) : (hours >= 24 ? 1 : 0);
                if (numberOfInputs > 0) {
                    const savedSchedule = JSON.parse(localStorage.getItem(`${patientCode}_${medId}_schedule`)) || {};
                    let timeInputsHTML = '';
                    for (let j = 0; j < numberOfInputs; j++) {
                        timeInputsHTML += `<input type="time" class="time-input" data-index="${j}" value="${savedSchedule[j] || ''}">`;
                    }
                    scheduleHTML = `<div class="schedule-container"><strong>Horarios de administración:</strong><div class="time-inputs-grid">${timeInputsHTML}</div></div>`;
                }
            }

            const savedProgress = JSON.parse(localStorage.getItem(`${patientCode}_${medId}_progress`)) || {};
            const duration = parseInt(med.duracion) || 0;
            let progressChecksHTML = '';
            for (let day = 1; day <= duration; day++) {
                progressChecksHTML += `<label><input type="checkbox" data-day="${day}" ${savedProgress[day] ? 'checked' : ''}><span>${day}</span></label>`;
            }

            const savedStatus = localStorage.getItem(`${patientCode}_${medId}_status`);
            const cardStatusClass = savedStatus ? `status-${savedStatus}` : '';

            const medicationHTML = `
                <article class="medication-item card ${cardStatusClass}" id="${medId}">
                    <div class="medication-header"><h4>${med.generico} (${med.comercial || 'N/A'})</h4><small>Indicado el: ${med.fecha_indicacion || 'N/A'}</small></div>
                    <div class="medication-details"><p><strong>Presentación:</strong> ${med.presentacion||'N/A'}</p><p><strong>Concentración:</strong> ${med.concentracion||'N/A'}</p><p><strong>Surtir:</strong> ${med.surtir||'N/A'}</p><p><strong>Vía:</strong> ${med.via||'N/A'}</p><p><strong>Dosis:</strong> ${med.dosis||'N/A'}</p><p><strong>Frecuencia:</strong> ${med.frecuencia||'N/A'}</p></div>
                    <p><strong>Duración:</strong> ${med.duracion||'N/A'} días</p><p><strong>Indicaciones Especiales:</strong> ${med.indicaciones||'Ninguna'}</p>
                    ${scheduleHTML}
                    <div class="progress-tracker"><strong>Avance del tratamiento (días):</strong><div class="progress-checks">${progressChecksHTML}</div></div>
                    <div class="treatment-status"><strong>Estado del Tratamiento:</strong><input type="radio" name="status_${medId}" id="status_finished_${i}" value="finished" ${savedStatus === 'finished' ? 'checked' : ''}><label for="status_finished_${i}">✅ Terminado</label><input type="radio" name="status_${medId}" id="status_suspended_${i}" value="suspended" ${savedStatus === 'suspended' ? 'checked' : ''}><label for="status_suspended_${i}">❌ Suspendido</label></div>
                </article>`;
            allMedicationsHTML.push(medicationHTML);
        }
    }

    container.innerHTML = (medicationCount > 0) ? allMedicationsHTML.join('') : `<div class="card"><p>No hay medicamentos indicados por el momento.</p></div>`;
}

async function populateRecetaPage() {
    const patientCode = localStorage.getItem('patientCode');
    if (!patientCode) { document.body.innerHTML = 'Error: Código de paciente no encontrado.'; return; }
    const data = await fetchData();
    if (!data) { document.body.innerHTML = 'Error al cargar los datos.'; return; }
    const patientData = data.find(row => row.codigo_unico && row.codigo_unico.trim().toUpperCase() === patientCode);
    if (patientData) {
        document.getElementById('receta-paciente').textContent = patientData.nombre_completo || '';
        document.getElementById('receta-dob').textContent = patientData.fecha_nacimiento || '';
        document.getElementById('receta-diagnostico').textContent = patientData.diagnostico || 'No especificado.';
        document.getElementById('receta-fecha').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        const medList = document.getElementById('receta-medicamentos');
        medList.innerHTML = '';
        let medCount = 0;
        for (let i = 1; i <= 15; i++) {
            if (patientData[`med${i}_generico`] && patientData[`med${i}_generico`].trim() !== '') {
                medCount++;
                const medItem = document.createElement('li');
                medItem.innerHTML = `<strong>${patientData[`med${i}_generico`]} (${patientData[`med${i}_comercial`]})</strong> - ${patientData[`med${i}_presentacion`]} ${patientData[`med${i}_concentracion`]}<br>Surtir: ${patientData[`med${i}_surtir`]}<br>Indicaciones: ${patientData[`med${i}_dosis`]} ${patientData[`med${i}_via`]} cada ${patientData[`med${i}_frecuencia`]} por ${patientData[`med${i}_duracion`]} días.<br><i>${patientData[`med${i}_indicaciones`]}</i>`;
                medList.appendChild(medItem);
            }
        }
        if (medCount === 0) { medList.innerHTML = '<li>No hay medicamentos indicados.</li>'; }
    } else { document.body.innerHTML = `Error: Paciente con código "${patientCode}" no encontrado.`; }
}

function calculateAge(dobString) {
    if (!dobString) return 'Fecha no proporcionada.';
    const parts = dobString.trim().split(/[/|-]/);
    if (parts.length !== 3) return 'Formato inválido.';
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Caracteres no válidos.';
    const dob = new Date(year, month, day);
    if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) return "Fecha inexistente.";
    const today = new Date();
    if (dob > today) return "Fecha en el futuro.";
    let ageYears = today.getFullYear() - dob.getFullYear(), ageMonths = today.getMonth() - dob.getMonth(), ageDays = today.getDate() - dob.getDate();
    if (ageDays < 0) { ageMonths--; ageDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
    if (ageMonths < 0) { ageYears--; ageMonths += 12; }
    return `${ageYears} años, ${ageMonths} meses y ${ageDays} días`;
}

function setupDynamicEventListeners() {
    const medList = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    if (!medList || !patientCode) return;
    medList.addEventListener('change', function(event) {
        const medicationCard = event.target.closest('.medication-item');
        if (!medicationCard) return;
        const medId = medicationCard.id;
        if (event.target.type === 'checkbox') {
            const day = event.target.dataset.day, key = `${patientCode}_${medId}_progress`, data = JSON.parse(localStorage.getItem(key)) || {};
            data[day] = event.target.checked;
            localStorage.setItem(key, JSON.stringify(data));
        } else if (event.target.type === 'radio') {
            const key = `${patientCode}_${medId}_status`;
            localStorage.setItem(key, event.target.value);
            medicationCard.classList.remove('status-finished', 'status-suspended');
            if (event.target.checked) { medicationCard.classList.add(`status-${event.target.value}`); }
        } else if (event.target.classList.contains('time-input')) {
            const index = event.target.dataset.index, key = `${patientCode}_${medId}_schedule`, data = JSON.parse(localStorage.getItem(key)) || {};
            data[index] = event.target.value;
            localStorage.setItem(key, JSON.stringify(data));
        }
    });
}

function setupActionButtons(data) {
    const configureButton = (id, linkData) => {
        const button = document.getElementById(id);
        if (button) {
            // Comprobación más segura: verifica que linkData sea una cadena no vacía
            if (typeof linkData === 'string' && linkData.trim() !== '') {
                button.href = linkData;
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        }
    };
    configureButton('expediente-btn', data.enlace_expediente);
    configureButton('telegram-btn', data.enlace_telegram);
    configureButton('plan-alimentacion-btn', data.enlace_plan_alimentacion);
    document.getElementById('save-image-btn').addEventListener('click', () => {
        html2canvas(document.getElementById('app-content'), { useCORS: true, backgroundColor: '#f0f4f8' }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Avance_AppReceta_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    });
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('patientCode');
            window.location.href = 'index.html';
        });
    }
}

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Papa === 'undefined') {
        console.error('La librería PapaParse no está cargada.');
        if (document.getElementById('loader')) {
            document.getElementById('loader').textContent = "Error de configuración. Contacte al administrador.";
        }
        return;
    }

    if (document.querySelector('.page')) { // En receta.html
        populateRecetaPage();
    } else if (document.getElementById('app-content')) { // En app.html
        loadPatientData();
    }
});
