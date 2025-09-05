// === PAGE SWITCHER (selalu aktif, tidak tergantung map) ===
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
}

// === LOGIN LOGIC ===
async function login(username, password) {
  try {
    const resp = await fetch('./users.json'); // file users.json
    const users = await resp.json();

    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", found.username);

      document.getElementById("loggedUser").textContent = found.username;
      document.querySelector("nav").style.display = "block";
      showPage("mapPage");
      document.getElementById("loginPage").style.display = "none";

      // ? refresh map setelah login
      setTimeout(() => {
        if (window.leafletMap) window.leafletMap.invalidateSize();
         window.leafletMap.setView([-2.2, 115.5], 13);
      }, 200);
    } else {
      document.getElementById("loginError").style.display = "block";
    }
  } catch (err) {
    console.error("Error loading users.json:", err);
  }
}

document.getElementById("loginBtn")?.addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  login(username, password);
});

// Cek status login saat load
document.addEventListener("DOMContentLoaded", () => {
  const loggedIn = localStorage.getItem("isLoggedIn");
  if (loggedIn === "true") {
    showPage("mapPage");
    document.querySelector("nav").style.display = "block";
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("loggedUser").textContent = localStorage.getItem("username") || "";

    // ? refresh map setelah reload
    setTimeout(() => {
      if (window.leafletMap) window.leafletMap.invalidateSize();
    }, 200);
  } else {
    showPage("loginPage");
    document.querySelector("nav").style.display = "none"; // sembunyikan navbar
  }
});

// === LOGOUT LOGIC ===
document.getElementById("nav-logout")?.addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("username");
  showPage("loginPage");
  document.querySelector("nav").style.display = "none";
});

// === NAVIGATION MENU ===
document.getElementById("nav-map")?.addEventListener("click", () => {
  showPage("mapPage");
  // ? refresh map setelah klik menu Map
  setTimeout(() => {
    if (window.leafletMap) window.leafletMap.invalidateSize();
  }, 200);
});
document.getElementById("nav-dashboard")?.addEventListener("click", () => showPage("dashboardPage"));
document.getElementById("nav-legend")?.addEventListener("click", () => showPage("legendPage"));
document.getElementById("nav-help")?.addEventListener("click", () => showPage("helpPage"));

// Tutup navbar collapse setelah klik (mobile)
document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    const navCollapse = document.getElementById('navbarNav');
    if (navCollapse) {
      const bsCollapse = bootstrap.Collapse.getInstance(navCollapse) || new bootstrap.Collapse(navCollapse, { toggle: false });
      bsCollapse.hide();
    }
  });
});


// ============================================================================
// MAP + DASHBOARD LOGIC (diletakkan setelah login supaya lebih aman)
// ============================================================================
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

  // Ortho layer 
  const orthoLayer = L.tileLayer('http://10.165.1.14:9090/service?layer=basemap-image&style=&tilematrixset=grid_merc&Service=WMTS&Request=GetTile&Version=1.3.0&Format=png&TileMatrix={z}&TileCol={x}&TileRow={y}', {
    maxZoom: 18,
    attribution: '&copy; Adaro Survey, 2025'
  });
   // Topo layer 
  const topoLayer = L.tileLayer('http://10.165.1.14:9090/service?layer=basemap-topo&style=&tilematrixset=grid_merc&Service=WMTS&Request=GetTile&Version=1.3.0&Format=png&TileMatrix={z}&TileCol={x}&TileRow={y}', {
    maxZoom: 18,
    attribution: '&copy; Adaro Survey, 2025'
  }); 
  // Map init
  const map = L.map('map', {
    center: [-2.2, 115.5],
    zoom: 13,
    layers: [googleSat]
  });
  window.leafletMap = map;

  // === Color Mapping ===
  const riskColors = {
    "Critical": "#ff0000",
    "High": "#ff8e00",
    "Medium": "#fff000",
    "Low": "#00ff00",
    "No data": "#cecece"
  };
  const ageColors = {
    "Hari ini": "#cc4c02",
    "7 hari": "#fe9929",
    "30 hari": "#fed98e",
    "Lebih dari 30 hari": "#ffffd4",
    "No data": "#cecece"
  };
  const priorColors = {
    "PRIORITAS 1": "#7fcdbb",
    "PRIORITAS 2": "#edf8b1",
    "No data": "#cecece"
  };

  // Kumpulan legend
  const legendMaps = {
    "Tingkat Risiko": riskColors,
    "Waktu Inspeksi": ageColors,
    "Prioritas": priorColors
  };

  // === Map Marker Coloring Functions ===
  function getRiskColor(level) { return riskColors[level] || "#cecece"; }
  function getAgeColor(age) { return ageColors[age] || "#cecece"; }
  function getPrioritasColor(p) {
    return priorColors[p.toUpperCase?.()] || priorColors[p] || "#cecece";
  }

  // === Popup bind function ===
  function bindPopup(feature, layer) {
    let props = feature.properties;
    let html = `<strong>ID Culvert: ${props["ID Culvert"] || "-"}</strong><br>
      <strong>Mitra Kerja Penanggungjawab:</strong> ${props["Mitra Kerja Responsible"] || "-"}</br>
      <strong>Tanggal Inspeksi:</strong> ${props["Tanggal Inspeksi"] || "-"}</br>
      <strong>Tingkat Risiko:</strong> ${props["RiskLevel"] || "-"}</br>
      <strong>Inspeksi Terakhir:</strong> ${props["LastCheck"] || "-"}</br>
      <strong>Prioritas:</strong> ${props["Prioritas"] || "-"}</br>
      <strong>Jumlah Line:</strong> ${props["Jumlah Line"] || "-"}</br>
      <strong>Foto Inlet:</strong> ${props["FotoInlet"] || "-"}</br>
      <strong>Foto Outlet:</strong> ${props["FotoOutlet"] || "-"}</br>
      <strong>Foto Tambahan:</strong> ${props["FotoOther"] || "-"}</br>
      <button class="btn btn-sm btn-primary mt-2 zoom-btn">Zoom To</button>`;

    layer.bindPopup(html);

    // Event tombol zoom
    layer.on("popupopen", () => {
      const btn = document.querySelector(".zoom-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          map.setView(layer.getLatLng(), 18);
          layer.closePopup();
        });
      }
    });
  }

  // Load GeoJSON
  fetch('./data/culverts_score_new.geojson')
    .then(resp => resp.json())
    .then(data => {
      // Layer RiskLevel
      const culvertLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          let lvl = feature.properties?.RiskLevel || "No data";
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: getRiskColor(lvl),
            color: '#ffffff',
            weight: 1.4,
            opacity: 1,
            fillOpacity: 0.85
          });
        },
        onEachFeature: bindPopup
      });

      // Layer Inspection Time
      const inspectionLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          let ageGroup = feature.properties?.LastCheckGroup || "No data";
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: getAgeColor(ageGroup),
            color: '#ffffff',
            weight: 1.4,
            opacity: 1,
            fillOpacity: 1
          });
        },
        onEachFeature: bindPopup
      });

      // Layer Prioritas
      const prioritasLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          let p = feature.properties?.Prioritas || "No data";
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: getPrioritasColor(p),
            color: '#ffffff',
            weight: 1.4,
            opacity: 1,
            fillOpacity: 1
          });
        },
        onEachFeature: bindPopup
      });

      // Basemap control
      const baseMaps = {"Google Satellite": googleSat, "OpenStreetMap": osm,"Orthophoto": orthoLayer, "Topographic Map": topoLayer};
      L.control.layers(baseMaps, {}, { collapsed: false }).addTo(map);

      // Thematic layers
      const thematicLayers = {
        "Tingkat Risiko": culvertLayer,
        "Waktu Inspeksi Terakhir": inspectionLayer,
        "Tingkat Prioritas": prioritasLayer
      };
      culvertLayer.addTo(map);

      // Custom control pilih tema
      const ThematicControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
          const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom p-2 bg-white shadow rounded');
          div.innerHTML = `<strong>Tema Status Culvert</strong><br>`;
          Object.keys(thematicLayers).forEach((key, idx) => {
            div.innerHTML += `
              <div>
                <input type="radio" name="thematicRadio" id="radio_${idx}" value="${key}" ${idx === 0 ? 'checked' : ''}>
                <label for="radio_${idx}">${key}</label>
              </div>`;
          });

          div.querySelectorAll('input[name="thematicRadio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
              Object.values(thematicLayers).forEach(lyr => map.removeLayer(lyr));
              thematicLayers[e.target.value].addTo(map);
            });
          });

          L.DomEvent.disableClickPropagation(div);
          return div;
        }
      });
      map.addControl(new ThematicControl());

      try { map.fitBounds(culvertLayer.getBounds(), { maxZoom: 16 }); } catch (e) {}
    });

  // === Dashboard ===
  let charts = {};  
  let geoData = null;  
  let currentField = "RiskLevel"; 
  let dashboardChart = null;
  let dashboardDataMap = {};

  // Load GeoJSON untuk dashboard
  fetch('./data/culverts_score_new.geojson')
    .then(resp => resp.json())
    .then(data => {
      geoData = data;
      // Bisa auto load default chart jika mau
      drawDashboardChart("BUMA", "RiskLevel");
    });

  // === Chart & Table Dashboard ===
  function drawDashboardChart(mitra, field) {
    if (!geoData) return;

    const counts = {};
    dashboardDataMap = {};

    geoData.features.forEach(f => {
      const m = (f.properties["Mitra Kerja Responsible"] || "").toUpperCase();
      if (m !== mitra) return;

      let val;
      if (field === "RiskLevel") {
        val = f.properties["RiskLevel"] || "No data";
      } else if (field === "LastCheckGroup") {
        val = f.properties["LastCheckGroup"] || "No data";
      } else if (field.toUpperCase() === "PRIORITAS") {
        val = f.properties["Prioritas"] || "No data"; // ? ambil field "Prioritas"
      } else {
        val = "No Data";
      }

      counts[val] = (counts[val] || 0) + 1;
      if (!dashboardDataMap[val]) dashboardDataMap[val] = [];
      dashboardDataMap[val].push(f.properties);
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    let colorMap = {};
    if (field === "RiskLevel") colorMap = riskColors;
    else if (field === "LastCheckGroup") colorMap = ageColors;
    else if (field.toUpperCase() === "PRIORITAS") colorMap = priorColors;

    if (dashboardChart) dashboardChart.destroy();

    const ctx = document.getElementById("dashboardChart").getContext("2d");

    // Atur ukuran canvas via JS
    ctx.canvas.style.maxWidth = "100%";   // batas lebar chart
    ctx.canvas.style.width = "100%";       // tetap responsive
    ctx.canvas.style.height = "400px";     // tinggi fix
    ctx.canvas.style.margin = "0 auto";    // rata tengah
    dashboardChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: `${mitra} - ${field}`,
          data: values,
          backgroundColor: labels.map(l => colorMap[l] || "#1f78b4")
        }]
      },
      options: {
        indexAxis: 'y',              // horizontal bar
        responsive: true,
        maintainAspectRatio: false,  // biar tinggi 400px jalan
        plugins: { legend: { display: false } },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const category = labels[idx];
          fillCulvertTable(dashboardDataMap[category] || []);
        }
      }
    });
  }

  function fillCulvertTable(data) {
    const tbody = document.getElementById("culvertTableBody");
    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada data</td></tr>`;
      return;
    }

    data.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d["ID Culvert"] || "-"}</td>
        <td>${d["Mitra Kerja Responsible"] || "-"}</td>
        <td>${d["Tanggal Inspeksi"] || "-"}</td>
        <td>${d["RiskLevel"] || "-"}</td>
        <td>${d["LastCheck"] || "-"}</td>
        <td>${d["Prioritas"] || "-"}</td>
        <td>${d["Jumlah Line"] || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Event tombol Draw Chart
  document.getElementById("drawChartBtn")?.addEventListener("click", () => {
    const mitra = document.getElementById("mitraSelect").value;
    const field = document.getElementById("categorySelect").value;
    drawDashboardChart(mitra, field);
  });

  // === Generate Legend Dinamis ===
  function generateLegend(targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    container.innerHTML = "";

    Object.entries(legendMaps).forEach(([title, map], idx) => {
      const accordionId = `${targetId}_${idx}`;
      const item = document.createElement("div");
      item.className = "accordion-item";

      item.innerHTML = `
        <h2 class="accordion-header">
          <button class="accordion-button ${idx > 0 ? "collapsed" : ""}" type="button"
            data-bs-toggle="collapse" data-bs-target="#${accordionId}">
            Legend ${title}
          </button>
        </h2>
        <div id="${accordionId}" class="accordion-collapse collapse ${idx === 0 ? "show" : ""}">
          <div class="accordion-body">
            ${Object.entries(map).map(([key, color]) =>
              `<i class="legend-color" style="background:${color}"></i> ${key}<br>`
            ).join("")}
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    generateLegend("legendContainer"); // Legend Page
    generateLegend("mapLegend");       // Map Page
  });
} // <-- ini penutup if(document.getElementById('map'))



document.getElementById("nav-map").addEventListener("click", () => showPage("mapPage"));
document.getElementById("nav-dashboard").addEventListener("click", () => showPage("dashboardPage"));
document.getElementById("nav-legend").addEventListener("click", () => showPage("legendPage"));
document.getElementById("nav-help").addEventListener("click", () => showPage("helpPage"));

// Tutup navbar collapse setelah klik (mobile)
document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    const navCollapse = document.getElementById('navbarNav');
    const bsCollapse = bootstrap.Collapse.getInstance(navCollapse) || new bootstrap.Collapse(navCollapse, { toggle: false });
    bsCollapse.hide();
  });
});
