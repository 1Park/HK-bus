// 전역 변수
let map;
let markers = [];
let stopData = [];

// 지도 초기화
function initMap() {
    if (!map) {
        map = L.map('map').setView([22.3193, 114.1694], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
}

// 기존 마커 제거
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// 페이지 로드 시 지도 초기화
window.onload = () => {
    initMap();
};

async function fetchBusStops() {
    // 입력값 가져오기
    const kmbInput = document.getElementById('kmbInput').value;
    const ctbInput = document.getElementById('ctbInput').value;
    const gmbNtInput = document.getElementById('gmbNtInput').value;
    
    const kmbBuses = kmbInput ? kmbInput.split(',').map(bus => bus.trim()) : [];
    const ctbBuses = ctbInput ? ctbInput.split(',').map(bus => bus.trim()) : [];
    const gmbNtBuses = gmbNtInput ? gmbNtInput.split(',').map(bus => bus.trim()) : [];
    
    stopData = [];
    const notExist = [];

    document.getElementById('result').innerText = '데이터를 가져오는 중...';
    clearMarkers();

    // KMB 처리 (API)
    if (kmbBuses.length > 0) {
        const kmbResponse = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/route');
        const kmbRoutes = (await kmbResponse.json()).data.map(route => route.route);
        
        for (const bus of kmbBuses) {
            if (kmbRoutes.includes(bus)) {
                try {
                    const routeResponse = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${bus}/outbound/1`);
                    const routeData = await routeResponse.json();
                    for (const stop of routeData.data) {
                        const stopResponse = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stop.stop}`);
                        const stopInfo = await stopResponse.json();
                        stopData.push({
                            Name: stopInfo.data.name_en,
                            Lat: parseFloat(stopInfo.data.lat),
                            Long: parseFloat(stopInfo.data.long),
                            Bus: bus,
                            Category: 'KMB'
                        });
                    }
                } catch (error) {
                    notExist.push(`KMB-${bus}`);
                }
            } else {
                notExist.push(`KMB-${bus}`);
            }
        }
    }

    // CTB 처리 (API) - 엔드포인트를 /v2/로 수정
    if (ctbBuses.length > 0) {
        const ctbResponse = await fetch('https://rt.data.gov.hk/v2/transport/citybus/route/CTB');
        const ctbRoutes = (await ctbResponse.json()).data.map(route => route.route);
        
        for (const bus of ctbBuses) {
            if (ctbRoutes.includes(bus)) {
                try {
                    const routeResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${bus}/outbound`);
                    const routeData = await routeResponse.json();
                    for (const stop of routeData.data) {
                        const stopResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stop.stop}`); // /v2/ 사용
                        const stopInfo = await stopResponse.json();
                        stopData.push({
                            Name: stopInfo.data.name_en,
                            Lat: parseFloat(stopInfo.data.lat),
                            Long: parseFloat(stopInfo.data.long),
                            Bus: bus,
                            Category: 'CTB'
                        });
                    }
                } catch (error) {
                    notExist.push(`CTB-${bus}`);
                }
            } else {
                notExist.push(`CTB-${bus}`);
            }
        }
    }

    // GMB(NT) 처리 (HTML에서 정의된 busStopData 사용)
    if (gmbNtBuses.length > 0) {
        for (const bus of gmbNtBuses) {
            if (busStopData.GMB_NT[bus]) {
                const stops = busStopData.GMB_NT[bus];
                stops.forEach(stop => {
                    stopData.push({
                        Name: stop.name_en,
                        Lat: parseFloat(stop.lat),
                        Long: parseFloat(stop.long),
                        Bus: bus,
                        Category: 'GMB(NT)'
                    });
                });
            } else {
                notExist.push(`GMB(NT)-${bus}`);
            }
        }
    }

    // 결과 출력
    if (notExist.length > 0) {
        document.getElementById('result').innerText = `존재하지 않는 노선: ${notExist.join(', ')}`;
    } else {
        document.getElementById('result').innerText = '';
    }

    // 지도에 마커 추가
    if (stopData.length > 0) {
        stopData.forEach(stop => {
            const marker = L.marker([stop.Lat, stop.Long]).addTo(map)
                .bindPopup(`<b>${stop.Category} - ${stop.Bus}</b><br>${stop.Name}`);
            markers.push(marker);
        });

        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());

        document.getElementById('downloadCsv').style.display = 'block';
    } else {
        document.getElementById('downloadCsv').style.display = 'none';
    }
}

// CSV 다운로드 함수
function downloadCSV() {
    if (stopData.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8," 
        + "Category,Bus,Name,WKT\n"
        + stopData.map(row => `"${row.Category}","${row.Bus}","${row.Name}","POINT (${row.Long} ${row.Lat})"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bus_stops.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}