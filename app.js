// == MAP LOGIC ==
if (document.getElementById('map')) {
  // Google Satellite tile
  const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Satellite'
  });

  // OSM as alternative
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  });

  // Map init
  const map = L.map('map', {
    center: [-2.2, 115.5],
    zoom: 13,
    layers: [googleSat]
  });



  // Color mapping RiskLevel
  function getRiskColor(level) {
    switch ((level||'').toLowerCase()) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff8e00';
      case 'medium': return '#fff000';
      case 'low': return '#00ff00';
      case 'no data': return '#cecece';
      default: return '#ffffff';
    }
  }

  // Color mapping Inspection Time (Age)
  function getAgeColor(age) {
    switch ((age||'').toLowerCase()) {
      case 'hari ini': return '#cc4c02';   // biru
      case '7 hari': return '#fe9929';    // hijau
      case '30 hari': return '#fed98e';   // oranye
      case 'lebih dari 30 hari': return '#ffffd4';   // oranye
      case 'no data': return '#cecece';   // abu-abu
      default: return '#ffffff';
    }
  }

  // Color mapping Prioritas
  function getPrioritasColor(p) {
    switch ((p||'').toUpperCase()) {
      case 'PRIORITAS 1': return '#7fcdbb'; // merah
      case 'PRIORITAS 2': return '#edf8b1'; // merah muda
      default: return '#ffffff';
    }
  }

  // Load GeoJSON sekali
  fetch('./data/culverts_score_new.geojson')
    .then(resp => resp.json())
    .then(data => {
      // Layer RiskLevel
      const culvertLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          let lvl = feature.properties?.RiskLevel || '';
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: getRiskColor(lvl),
            color: '#ffffff',
            weight: 1.4,
            opacity: 1,
            fillOpacity: 0.85
          });
        },
        onEachFeature: (feature, layer) => {
          let props = feature.properties;
          let html = `<strong>ID Culvert: ${props["ID Culvert"] || "-"}</strong><br>
            <strong>Mitra Kerja Penanggungjawab:</strong> ${props["Mitra Kerja Responsible"] || "-"}<br>
            <strong>Tanggal Inspeksi:</strong> ${props["Tanggal Inspeksi"] || "-"}<br>
            <strong>Tingkat Risiko:</strong> ${props["RiskLevel"] || "-"}<br>
            <strong>Inspeksi Terakhir:</strong> ${props["LastCheck"] || "-"}<br>
            <strong>Prioritas:</strong> ${props["Prioritas"] || "-"}<br>
            <strong>Foto Inlet:</strong> ${props["FotoInlet"] || "-"}<br>
            <strong>Foto Outlet:</strong> ${props["FotoOutlet"] || "-"}<br>
            <strong>Foto Tambahan:</strong> ${props["FotoOther"] || "-"}<br>`;
          layer.bindPopup(html);
        }
      });

      // Layer Inspection Time
      const inspectionLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          let age = feature.properties?.LastCheckGroup|| '';
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: getAgeColor(age),
            color: '#ffffff',
            weight: 1.4,
            opacity: 1,
            fillOpacity: 1
          });
        },
        onEachFeature: (feature, layer) => {
          let props = feature.properties;
          layer.bindPopup(`<strong>ID Culvert: ${props["ID Culvert"] || "-"}</strong><br>
            <strong>Tanggal Inspeksi:</strong> ${props["Tanggal Inspeksi"] || "-"}<br>
            <strong>Waktu Inspeksi:</strong> ${props["LastCheck"] || "-"}`);
        }
      });

      // Layer Prioritas Culvert
      const prioritasLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          let p = feature.properties?.Prioritas || '';
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: getPrioritasColor(p),
            color: '#ffffff',
            weight: 1.4,
            opacity: 1,
            fillOpacity: 1
          });
        },
        onEachFeature: (feature, layer) => {
          let props = feature.properties;
          layer.bindPopup(`<strong>ID Culvert: ${props["ID Culvert"] || "-"}</strong><br>
            <strong>Prioritas:</strong> ${props["Prioritas"] || "-"}`);
        }
      });

// === Grup Basemap (pakai bawaan Leaflet) ===
    const baseMaps = {
      "Google Satellite": googleSat,
      "OpenStreetMap": osm
    };
    L.control.layers(baseMaps, {}, { collapsed: false }).addTo(map);

    // === Grup Thematic (custom radio control) ===
    const thematicLayers = {
      "Tingkat Risiko": culvertLayer,
      "Waktu Inspeksi Terakhir": inspectionLayer,
      "Tingkat Prioritas": prioritasLayer
    };

    // Default tampilkan RiskLevel
    culvertLayer.addTo(map);

    // Custom Control
    const ThematicControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom p-2 bg-white shadow rounded');
        div.innerHTML = `<strong>Tema Status Culvert</strong><br>`;
        Object.keys(thematicLayers).forEach((key, idx) => {
          div.innerHTML += `
            <div>
              <input type="radio" name="thematicRadio" id="radio_${idx}" value="${key}" ${idx===0 ? 'checked' : ''}>
              <label for="radio_${idx}">${key}</label>
            </div>`;
        });

        // Event listener radio change
        div.querySelectorAll('input[name="thematicRadio"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            // Remove semua layer dulu
            Object.values(thematicLayers).forEach(lyr => map.removeLayer(lyr));
            // Add layer yang dipilih
            thematicLayers[e.target.value].addTo(map);
          });
        });

        // Supaya control bisa diklik tanpa geser peta
        L.DomEvent.disableClickPropagation(div);

        return div;
      }
    });

    // Tambahkan control thematic
    map.addControl(new ThematicControl());
      // Pastikan legend accordion bisa diklik & collapse berfungsi
    const legendBox = document.querySelector('.legend-box');
    if (legendBox) {
      L.DomEvent.disableClickPropagation(legendBox);
      L.DomEvent.disableScrollPropagation(legendBox);
    }
    // Fit extent default
    try { map.fitBounds(culvertLayer.getBounds(), { maxZoom: 16 }); } catch(e){}
  });


}


