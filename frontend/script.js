document.getElementById("transferForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const toAccountId = document.getElementById("toAccountId").value;
    const amount = document.getElementById("amount").value;
    
    const response = await fetch("http://localhost:4000/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toAccountId, amount })
    });
    
    const data = await response.json();
    document.getElementById("result").textContent = JSON.stringify(data, null, 2);
  });
  