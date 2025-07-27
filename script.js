// script.js (Versión Final Definitiva)

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCh0jOiaAGNdoytpJ1sU8W-tJHO6ef1Mmgu4JpMA7oU3KvAvWNmioFlLJ4XzHH_Tgk1-wPAvpw7YaM/pub?gid=0&single=true&output=csv';

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-content')) {
        loadPatientData();
    }
});

// --- FUNCIONES DE CARGA Y VISUALIZACIÓN ---

async function fetchData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) throw new Error('Respuesta de red no fue exitosa.');
        const text = await response.text();
        return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
    } catch (error) {
        console.error('Error crítico en fetchData:', error);
        return null;
    }
}

async function loadPatientData() {
    const loader = document.getElementById('loader');
    const patientCode = localStorage.getItem('patientCode');

    if (!patientCode) {
        loader.textContent = 'Error: Código de paciente no encontrado. Regrese a la página de inicio.';
        return;
    }

    try {
        const data = await fetchData();
        if (!data) {
            loader.textContent = 'No se pudieron cargar los datos. Verifique la conexión a internet.';
            return;
        }

        const patientData = data.find(row => row.codigo_unico && row.codigo_unico.trim().toUpperCase() === patientCode);

        if (patientData) {
            loader.style.display = 'none'; // Oculta el cargador ANTES de procesar

            // Guarda los datos para la página de receta
            localStorage.setItem('currentPatientData', JSON.stringify(patientData));

            displayPatientInfo(patientData);
            displayMedications(patientData);
            setupActionButtons(patientData);
            setupDynamicEventListeners();
            setupLogoutButton();

            document.getElementById('patient-info').style.display = 'block';
            document.getElementById('diagnosis-section').style.display = 'block';
        } else {
            loader.textContent = `Código "${patientCode}" no encontrado. Verifique que sea correcto.`;
        }
    } catch (error) {
        console.error("Error en loadPatientData:", error);
        loader.textContent = 'Ocurrió un error inesperado al cargar la información.';
    }
}

function displayPatientInfo(data) {
    document.getElementById('patient-name').textContent = data.nombre_completo || 'N/A';
    document.getElementById('patient-dob').textContent = data.fecha_nacimiento || 'N/A';
    document.getElementById('patient-weight').textContent = `${data.peso_kg || 'N/A'} kg`;
    document.getElementById('patient-diagnosis').textContent = data.diagnostico || 'No especificado.';
    if (data.alergias && data.alergias.trim()) {
        document.getElementById('patient-allergies').textContent = `ALERGIAS: ${data.alergias}`;
    } else {
        document.getElementById('patient-allergies').style.display = 'none';
    }
    document.getElementById('patient-age').textContent = calculateAge(data.fecha_nacimiento);
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function displayMedications(data) {
    const container = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    
    let allMedicationsHTML = [];
    let medicationCount = 0;

    for (let i = 1; i <= 10; i++) {
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

            // --- LÓGICA PARA GENERAR HORARIOS ---
            let scheduleHTML = '';
            const frequencyString = med.frecuencia || '';
            const match = frequencyString.match(/(\d+)/);
            let numberOfInputs = 0;
            if (match) {
                const hours = parseInt(match[1], 10);
                if (hours > 0 && hours < 24) {
                    numberOfInputs = Math.floor(24 / hours);
                } else if (hours === 24) {
                    numberOfInputs = 1;
                }
            }
            
            if (numberOfInputs > 0) {
                const savedSchedule = JSON.parse(localStorage.getItem(`${patientCode}_${medId}_schedule`)) || {};
                let timeInputsHTML = '';
                for (let j = 0; j < numberOfInputs; j++) {
                    const savedTime = savedSchedule[j] || '';
                    timeInputsHTML += `<input type="time" class="time-input" data-index="${j}" value="${savedTime}">`;
                }
                scheduleHTML = `
                    <div class="schedule-container">
                        <strong>Horarios de administración:</strong>
                        <div class="time-inputs-grid">${timeInputsHTML}</div>
                    </div>
                `;
            }
            // --- FIN DE LÓGICA DE HORARIOS ---

            const savedProgress = JSON.parse(localStorage.getItem(`${patientCode}_${medId}_progress`)) || {};
            const savedStatus = localStorage.getItem(`${patientCode}_${medId}_status`);
            
            let progressChecksHTML = '';
            const duration = parseInt(med.duracion) || 0;
            for (let day = 1; day <= duration; day++) {
                const isChecked = savedProgress[day] ? 'checked' : '';
                progressChecksHTML += `<label><input type="checkbox" data-day="${day}" ${isChecked}><span>${day}</span></label>`;
            }

            const isFinished = savedStatus === 'finished' ? 'checked' : '';
            const isSuspended = savedStatus === 'suspended' ? 'checked' : '';
            const cardStatusClass = savedStatus ? `status-${savedStatus}` : '';

            const medicationHTML = `
                <article class="medication-item card ${cardStatusClass}" id="${medId}">
                    <div class="medication-header"><h4>${med.generico} (${med.comercial || 'N/A'})</h4><small>Indicado el: ${med.fecha_indicacion || 'N/A'}</small></div>
                    <div class="medication-details">
                        <p><strong>Presentación:</strong> ${med.presentacion || 'N/A'}</p><p><strong>Concentración:</strong> ${med.concentracion || 'N/A'}</p>
                        <p><strong>Surtir:</strong> ${med.surtir || 'N/A'}</p><p><strong>Vía:</strong> ${med.via || 'N/A'}</p>
                        <p><strong>Dosis:</strong> ${med.dosis || 'N/A'}</p><p><strong>Frecuencia:</strong> ${med.frecuencia || 'N/A'}</p>
                    </div>
                    <p><strong>Duración:</strong> ${med.duracion || 'N/A'} días</p><p><strong>Indicaciones Especiales:</strong> ${med.indicaciones || 'Ninguna'}</p>
                    
                    ${scheduleHTML} 

                    <div class="progress-tracker"><strong>Avance del tratamiento (días):</strong><div class="progress-checks">${progressChecksHTML}</div></div>
                    <div class="treatment-status">
                        <strong>Estado del Tratamiento:</strong>
                        <input type="radio" name="status_${medId}" id="status_finished_${i}" value="finished" ${isFinished}><label for="status_finished_${i}">✅ Terminado</label>
                        <input type="radio" name="status_${medId}" id="status_suspended_${i}" value="suspended" ${isSuspended}><label for="status_suspended_${i}">❌ Suspendido</label>
                    </div>
                </article>
            `;
            allMedicationsHTML.push(medicationHTML);
        }
    }

    if (medicationCount === 0) {
        container.innerHTML = `<div class="card"><p>No hay medicamentos indicados por el momento.</p></div>`;
    } else {
        container.innerHTML = allMedicationsHTML.join('');
    }
}


// --- FUNCIONES DE UTILIDAD Y EVENTOS ---

function calculateAge(dobString) {
    if (!dobString || typeof dobString !== 'string') return 'N/A';
    const parts = dobString.trim().split(/[/|-]/);
    if (parts.length !== 3) return 'Fecha inválida';
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Fecha inválida';
    const dob = new Date(year, month, day);
    if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) return "Fecha no existe";
    const today = new Date();
    if (dob > today) return "Fecha futura";
    let ageYears = today.getFullYear() - dob.getFullYear(), ageMonths = today.getMonth() - dob.getMonth(), ageDays = today.getDate() - dob.getDate();
    if (ageDays < 0) { ageMonths--; ageDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
    if (ageMonths < 0) { ageYears--; ageMonths += 12; }
    return `${ageYears} años, ${ageMonths} meses y ${ageDays} días`;
}

function setupActionButtons(data) {
    const expedienteBtn = document.getElementById('expediente-btn');
    if (data.enlace_expediente) expedienteBtn.href = data.enlace_expediente;
    else expedienteBtn.style.display = 'none';

    const telegramBtn = document.getElementById('telegram-btn');
    if (data.enlace_telegram) telegramBtn.href = data.enlace_telegram;
    else telegramBtn.style.display = 'none';

    document.getElementById('save-image-btn').addEventListener('click', () => {
        html2canvas(document.getElementById('app-content'), { useCORS: true, backgroundColor: '#f0f4f8' }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Avance_AppReceta_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    });
}

function setupDynamicEventListeners() {
    const medList = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    if (!medList || !patientCode) return;

    medList.addEventListener('change', (event) => {
        const medicationCard = event.target.closest('.medication-item');
        if (!medicationCard) return;
        const medId = medicationCard.id;

        if (event.target.type === 'checkbox') {
            const day = event.target.dataset.day;
            const progressKey = `${patientCode}_${medId}_progress`;
            const savedProgress = JSON.parse(localStorage.getItem(progressKey)) || {};
            savedProgress[day] = event.target.checked;
            localStorage.setItem(progressKey, JSON.stringify(savedProgress));
        }

        if (event.target.type === 'radio') {
            localStorage.setItem(`${patientCode}_${medId}_status`, event.target.value);
            medicationCard.classList.remove('status-finished', 'status-suspended');
            if (event.target.checked) medicationCard.classList.add(`status-${event.target.value}`);
        }
    });
}

function setupLogoutButton() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('patientCode');
        localStorage.removeItem('currentPatientData'); // Limpia también los datos del paciente
        window.location.href = 'index.html';
    });
}
