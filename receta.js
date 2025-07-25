// receta.js - Script exclusivo para la página de la receta

document.addEventListener('DOMContentLoaded', () => {
    const patientDataString = localStorage.getItem('currentPatientData');

    if (!patientDataString) {
        document.body.innerHTML = '<h1>Error</h1><p>No se encontraron datos del paciente. Por favor, regrese a la app y vuelva a generar la receta.</p>';
        return;
    }

    const patientData = JSON.parse(patientDataString);

    // Llenar datos del paciente
    document.getElementById('receta-paciente').textContent = patientData.nombre_completo || '';
    document.getElementById('receta-dob').textContent = patientData.fecha_nacimiento || '';
    document.getElementById('receta-diagnostico').textContent = patientData.diagnostico || 'No especificado.';
    document.getElementById('receta-fecha').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    // Llenar medicamentos
    const medList = document.getElementById('receta-medicamentos');
    let medCount = 0;
    for (let i = 1; i <= 10; i++) {
        if (patientData[`med${i}_generico`] && patientData[`med${i}_generico`].trim()) {
            medCount++;
            const medItem = document.createElement('li');
            medItem.innerHTML = `
                <strong>${patientData[`med${i}_generico`]} (${patientData[`med${i}_comercial`]})</strong> - ${patientData[`med${i}_presentacion`]} ${patientData[`med${i}_concentracion`]}<br>
                Surtir: ${patientData[`med${i}_surtir`]}<br>
                Indicaciones: ${patientData[`med${i}_dosis`]} ${patientData[`med${i}_via`]} cada ${patientData[`med${i}_frecuencia`]} por ${patientData[`med${i}_duracion`]} días.<br>
                <i>${patientData[`med${i}_indicaciones`]}</i>
            `;
            medList.appendChild(medItem);
        }
    }
    if (medCount === 0) {
        medList.innerHTML = '<li>No hay medicamentos indicados.</li>';
    }
});
