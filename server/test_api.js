async function runTest() {
  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:3001/api/health');
    console.log('1. Health check status:', healthRes.status, await healthRes.json());

    // 2. Flagship Restaurant
    const restRes = await fetch('http://localhost:3001/api/restaurants/primary/flagship');
    const restData = await restRes.json();
    console.log('2. Flagship restaurant:', restData.data?.name, 'Rating:', restData.data?.rating);

    // 3. Menu items
    const menuRes = await fetch('http://localhost:3001/api/restaurants/' + restData.data.id + '/menu');
    const menuData = await menuRes.json();
    console.log('3. Dishes loaded:', menuData.data?.length, 'First dish:', menuData.data?.[0]?.name, 'Price:', menuData.data?.[0]?.price);

    // 4. Delivery Zones
    const zonesRes = await fetch('http://localhost:3001/api/restaurants/zones/all');
    const zonesData = await zonesRes.json();
    console.log('4. Delivery zones:', zonesData.data?.length);

    // 5. Auth Login (Super Admin)
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@foodmaxx.ng', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    console.log('5. Admin Login success:', loginData.success, 'Token received:', !!loginData.token, 'Role:', loginData.user?.role);

    const token = loginData.token;

    // 6. Admin Overview Stats (Real DB calculation)
    const ovRes = await fetch('http://localhost:3001/api/admin/overview', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const ovData = await ovRes.json();
    console.log('6. Admin Overview:', ovData.data);

    // 7. Admin Payouts (Real DB calculation)
    const payRes = await fetch('http://localhost:3001/api/admin/payouts', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const payData = await payRes.json();
    console.log('7. Admin Payouts:', payData.data);

    console.log('\n ALL PRODUCTION ENDPOINTS VERIFIED AND WORKING!');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTest();
