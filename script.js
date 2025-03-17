// 전역 변수
let map;
let markers = [];
let stopData = [];
let kmbRoutes=null, ctbRoutes=null;

// 지도 초기화
function initMap() {
    if (!map) {
        map = L.map('map').setView([22.3193, 114.1694], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
}

async function loadKmb() {

    try {
        const kmbResponse = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/route');
        const kmbData = await kmbResponse.json();
        kmbRoutes = kmbData.data.map(route => route.route);
        console.log('KMB 루트 로드 완료:');
    } catch (error) {
        console.error('KMB 루트 로드 실패:', error);
    }
}

async function loadCtb(){

    try {
        const ctbResponse = await fetch('https://rt.data.gov.hk/v2/transport/citybus/route/CTB');
        const ctbData = await ctbResponse.json();
        ctbRoutes = ctbData.data.map(route => route.route);
        console.log('CTB 루트 로드 완료');
    } catch (error) {
        console.error('CTB 루트 로드 실패:', error);
    }
}

// 기존 마커 제거
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// 페이지 로드 시 지도 초기화
window.onload = async () => {
    initMap();
    loadKmb();
    loadCtb();
};

async function fetchBusStops() {
    // 입력값 가져오기
    const kmbInput = document.getElementById('kmbInput').value;
    const ctbInput = document.getElementById('ctbInput').value;
    const gmbNtInput = document.getElementById('gmbNtInput').value;
    const gmbHkiInput = document.getElementById('gmbHkiInput').value;
    const gmbKlnInput = document.getElementById('gmbKlnInput').value;
    
    const kmbBuses = kmbInput ? kmbInput.split(',').map(bus => bus.trim()) : [];
    const ctbBuses = ctbInput ? ctbInput.split(',').map(bus => bus.trim()) : [];
    const gmbNtBuses = gmbNtInput ? gmbNtInput.split(',').map(bus => bus.trim()) : [];
    const gmbHkiBuses = gmbHkiInput ? gmbHkiInput.split(',').map(bus => bus.trim()) : [];
    const gmbKlnBuses = gmbKlnInput ? gmbKlnInput.split(',').map(bus => bus.trim()) : [];


    stopData = [];
    const notExist = [];

    document.getElementById('result').innerText = 'Gathering Data...';
    clearMarkers();

    // KMB 처리 (API)
    if (kmbBuses.length > 0) {
        
        if(!kmbRoutes){
            await loadKmb();
        }
        if(kmbRoutes){
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
        
    }

    // CTB 처리 (API) 
    if (ctbBuses.length > 0) {
        if(!ctbRoutes){
            await loadCtb();
        }
        if(ctbRoutes){
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

    if (gmbHkiBuses.length > 0) {
        for (const bus of gmbHkiBuses) {
            if (busStopData.GMB_HKI[bus]) {
                const stops = busStopData.GMB_HKI[bus];
                stops.forEach(stop => {
                    stopData.push({
                        Name: stop.name_en,
                        Lat: parseFloat(stop.lat),
                        Long: parseFloat(stop.long),
                        Bus: bus,
                        Category: 'GMB(HKI)'
                    });
                });
            } else {
                notExist.push(`GMB(HKI)-${bus}`);
            }
        }
    }

    if (gmbKlnBuses.length > 0) {
        for (const bus of gmbKlnBuses) {
            if (busStopData.GMB_KLN[bus]) {
                const stops = busStopData.GMB_KLN[bus];
                stops.forEach(stop => {
                    stopData.push({
                        Name: stop.name_en,
                        Lat: parseFloat(stop.lat),
                        Long: parseFloat(stop.long),
                        Bus: bus,
                        Category: 'GMB(KLN)'
                    });
                });
            } else {
                notExist.push(`GMB(KLN)-${bus}`);
            }
        }
    }

    // 결과 출력
    if (notExist.length > 0) {
        document.getElementById('result').innerText = `Routes not exist: ${notExist.join(', ')}`;
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

        //지도 위치로 자동 스크롤
        const mapElement = document.getElementById('map');
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        document.getElementById('downloadCsv').style.display = 'none';
    }
}

// CSV 다운로드 함수
function downloadCSV() {
    if (stopData.length === 0) {
        alert('There is no existing data to download.');
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

