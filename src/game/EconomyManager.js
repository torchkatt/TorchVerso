export class EconomyManager {
    constructor() {
        this.balance = 1000; // Initial funds
        this.incomeRate = 0; // Tokens per second
        this.incomeTimer = 0;

        this.uiElement = null;
        this.initUI();
    }

    initUI() {
        // Create UI if not exists
        this.uiElement = document.createElement('div');
        this.uiElement.id = 'economy-display';
        this.uiElement.innerHTML = `
      <div class="token-icon">🪙</div>
      <div class="balance">1000</div>
      <div class="income">+0/s</div>
    `;
        document.body.appendChild(this.uiElement);
        this.updateUI();
    }

    update(delta) {
        // Passive Income Logic
        if (this.incomeRate > 0) {
            this.incomeTimer += delta;
            if (this.incomeTimer >= 1) { // Every second
                this.addFunds(this.incomeRate);
                this.incomeTimer = 0;
                this.showFloatingText(`+${this.incomeRate}`, '#00ff00');
            }
        }
    }

    canAfford(cost) {
        return this.balance >= cost;
    }

    spend(amount) {
        if (this.canAfford(amount)) {
            this.balance -= amount;
            this.updateUI();
            return true;
        }
        return false;
    }

    addFunds(amount) {
        this.balance += amount;
        this.updateUI();
    }

    addIncomeSource(amountPerSecond) {
        this.incomeRate += amountPerSecond;
        this.updateUI();
    }

    updateUI() {
        if (this.uiElement) {
            this.uiElement.querySelector('.balance').innerText = Math.floor(this.balance);
            this.uiElement.querySelector('.income').innerText = `+${this.incomeRate}/s`;
        }
    }

    showFloatingText(text, color) {
        const float = document.createElement('div');
        float.className = 'floating-text';
        float.innerText = text;
        float.style.color = color;

        // Random position near center
        const x = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
        const y = window.innerHeight / 2 - 100;

        float.style.left = `${x}px`;
        float.style.top = `${y}px`;

        document.body.appendChild(float);

        // Animate and remove
        setTimeout(() => {
            float.style.opacity = '0';
            float.style.transform = 'translateY(-50px)';
        }, 50);

        setTimeout(() => {
            float.remove();
        }, 1000);
    }
}
