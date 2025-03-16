async function fetchBusStops() {
    // 입력값 가져오기
    const kmbInput = document.getElementById('kmbInput').value;
    const ctbInput = document.getElementById('ctbInput').value;
    const gmbNtInput = document.getElementById('gmbNtInput').value;
    
    const kmbBuses = kmbInput ? kmbInput.split(',').map(bus => bus.trim()) : [];
    const ctbBuses = ctbInput ? ctbInput.split(',').map(bus => bus.trim()) : [];
    const gmbNtBuses = gmbNtInput ? gmbNtInput.split(',').map(bus => bus.trim()) : [];
    
    const stopData = [];
    const notExist = [];

    // 결과 영역 초기화
    document.getElementById('result').innerText = '데이터를 가져오는 중...';

    // KMB 처리
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
                            WKT: `POINT (${stopInfo.data.long} ${stopInfo.data.lat})`,
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

    // CTB 처리
    if (ctbBuses.length > 0) {
        const ctbResponse = await fetch('https://rt.data.gov.hk/v2/transport/citybus/route/CTB');
        const ctbRoutes = (await ctbResponse.json()).data.map(route => route.route);
        
        for (const bus of ctbBuses) {
            if (ctbRoutes.includes(bus)) {
                try {
                    const routeResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${bus}/outbound`);
                    const routeData = await routeResponse.json();
                    for (const stop of routeData.data) {
                        const stopResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stop.stop}`);
                        const stopInfo = await stopResponse.json();
                        stopData.push({
                            Name: stopInfo.data.name_en,
                            WKT: `POINT (${stopInfo.data.long} ${stopInfo.data.lat})`,
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

    // GMB(NT) 처리 에러 발생중....
    if (gmbNtBuses.length > 0) {
        const gmbResponse = await fetch('https://data.etagmb.gov.hk/route/NT');
        const gmbRoutes = (await gmbResponse.json()).data.routes;
        
        for (const bus of gmbNtBuses) {
            if (gmbRoutes.includes(bus)) {
                try {
                    const routeResponse = await fetch(`https://data.etagmb.gov.hk/route/NT/${bus}`);
                    const routeData = await routeResponse.json();
                    const busId = routeData.data[0].route_id;
                    const stopsResponse = await fetch(`https://data.etagmb.gov.hk/route-stop/${busId}/1`);
                    const stopsData = await stopsResponse.json();
                    for (const stop of stopsData.data.route_stops) {
                        const stopResponse = await fetch(`https://data.etagmb.gov.hk/stop/${stop.stop_id}`);
                        const stopInfo = await stopResponse.json();
                        const coord = stopInfo.data.coordinates.wgs84;
                        stopData.push({
                            Name: stop.name_en,
                            WKT: `POINT (${coord.longitude} ${coord.latitude})`,
                            Bus: bus,
                            Category: 'GMB(NT)'
                        });
                    }
                } catch (error) {
                    notExist.push(`GMB(NT)-${bus}`);
                }
            } else {
                notExist.push(`GMB(NT)-${bus}`);
            }
        }
    }

    // 결과 처리
    if (notExist.length > 0) {
        document.getElementById('result').innerText = `존재하지 않는 버스 노선: ${notExist.join(', ')}`;
    } else {
        document.getElementById('result').innerText = '';
    }

    if (stopData.length > 0) {
        generateCSV(stopData);
    }
}

// CSV 파일 생성 및 다운로드 함수
function generateCSV(data) {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Category,Bus,Name,WKT\n"
        + data.map(row => `"${row.Category}","${row.Bus}","${row.Name}","${row.WKT}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bus_stops.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}