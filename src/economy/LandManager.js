import * as THREE from 'three';

export class LandManager {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.plots = new Map(); // ID -> Plot Data
        this.playerWallet = 50000; // Initial funds for testing
        this.userId = null; // Will be set by AuthManager

        // Rent configurations
        this.rentOptions = {
            '24h': { label: '24 Horas', duration: 24 * 60 * 60 * 1000, priceMultiplier: 0.01 },
            '1w': { label: '1 Semana', duration: 7 * 24 * 60 * 60 * 1000, priceMultiplier: 0.05 },
            '1m': { label: '1 Mes', duration: 30 * 24 * 60 * 60 * 1000, priceMultiplier: 0.15 },
            '1y': { label: '1 Año', duration: 365 * 24 * 60 * 60 * 1000, priceMultiplier: 1.0 }
        };

        this.initUI();
    }

    setUser(userId) {
        this.userId = userId;
        console.log("LandManager: User set", userId);
    }

    initUI() {
        // Create Wallet UI
        const walletDiv = document.createElement('div');
        walletDiv.id = 'wallet-ui';
        walletDiv.style.position = 'absolute';
        walletDiv.style.top = '20px';
        walletDiv.style.right = '20px';
        walletDiv.style.background = 'rgba(0, 0, 0, 0.7)';
        walletDiv.style.color = '#00ff88';
        walletDiv.style.padding = '10px 20px';
        walletDiv.style.borderRadius = '8px';
        walletDiv.style.fontFamily = "'Orbitron', sans-serif";
        walletDiv.style.fontSize = '18px';
        walletDiv.style.border = '1px solid #00ff88';
        walletDiv.style.zIndex = '100';
        walletDiv.innerHTML = `💳 <span id="wallet-balance">${this.formatMoney(this.playerWallet)}</span>`;
        document.body.appendChild(walletDiv);

        // Create Transaction Modal (Hidden by default)
        const modal = document.createElement('div');
        modal.id = 'land-transaction-modal';
        modal.style.display = 'none';
        modal.style.position = 'absolute';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = 'rgba(10, 15, 30, 0.95)';
        modal.style.border = '2px solid #00ff88';
        modal.style.borderRadius = '15px';
        modal.style.padding = '30px';
        modal.style.color = 'white';
        modal.style.zIndex = '2000';
        modal.style.minWidth = '400px';
        modal.style.textAlign = 'center';
        modal.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.3)';
        modal.innerHTML = `
            <h2 style="color: #00ff88; margin-top: 0;">PROPIEDAD EN VENTA</h2>
            <div id="plot-info" style="margin: 20px 0; font-size: 1.2em;"></div>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button id="btn-buy" style="padding: 10px 20px; background: #00ff88; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">COMPRAR</button>
                <button id="btn-rent" style="padding: 10px 20px; background: #0088ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">RENTAR</button>
                <button id="btn-cancel" style="padding: 10px 20px; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">CANCELAR</button>
            </div>
            <div id="rent-options" style="display: none; margin-top: 20px; border-top: 1px solid #444; padding-top: 20px;">
                <h3 style="color: #0088ff;">Opciones de Renta</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="rent-opt" data-type="24h">24 Horas</button>
                    <button class="rent-opt" data-type="1w">1 Semana</button>
                    <button class="rent-opt" data-type="1m">1 Mes</button>
                    <button class="rent-opt" data-type="1y">1 Año</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Event Listeners
        document.getElementById('btn-cancel').onclick = () => this.closeModal();
        document.getElementById('btn-rent').onclick = () => {
            document.getElementById('rent-options').style.display = 'block';
        };

        // Rent option clicks
        document.querySelectorAll('.rent-opt').forEach(btn => {
            btn.onclick = (e) => {
                const type = e.target.dataset.type;
                this.rentPlot(this.currentInteractionPlotId, type);
            };
            // Style
            btn.style.padding = '8px';
            btn.style.background = 'rgba(0, 136, 255, 0.2)';
            btn.style.border = '1px solid #0088ff';
            btn.style.color = 'white';
            btn.style.cursor = 'pointer';
            btn.onmouseover = () => btn.style.background = 'rgba(0, 136, 255, 0.5)';
            btn.onmouseout = () => btn.style.background = 'rgba(0, 136, 255, 0.2)';
        });
    }

    showNotification(message, type = 'success') {
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '100px';
            container.style.right = '20px';
            container.style.zIndex = '10000';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            document.body.appendChild(container);
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = 'game-notification';

        // Type-based styling
        const colors = {
            success: { bg: 'rgba(0, 255, 136, 0.15)', border: '#00ff88', icon: '✅' },
            error: { bg: 'rgba(255, 68, 68, 0.15)', border: '#ff4444', icon: '❌' },
            info: { bg: 'rgba(0, 136, 255, 0.15)', border: '#0088ff', icon: 'ℹ️' },
            warning: { bg: 'rgba(255, 170, 0, 0.15)', border: '#ffaa00', icon: '⚠️' }
        };

        const style = colors[type] || colors.info;

        notification.style.cssText = `
            background: ${style.bg};
            border: 2px solid ${style.border};
            border-radius: 12px;
            padding: 15px 20px;
            color: white;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${style.border}33;
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        notification.innerHTML = `
            <span style="font-size: 20px;">${style.icon}</span>
            <span style="flex: 1;">${message}</span>
        `;

        container.appendChild(notification);

        // Add CSS animation if not already added
        if (!document.getElementById('notification-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'notification-styles';
            styleSheet.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
            `;
            document.head.appendChild(styleSheet);
        }

        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }, 4000);
    }

    registerPlot(id, price, position, size) {
        this.plots.set(id, {
            id,
            price,
            position,
            size,
            owner: null,
            rentExpires: null,
            mesh: null // To be linked with visual representation
        });
    }

    getPlotAt(position) {
        // Simple distance check or bounds check
        for (const [id, plot] of this.plots) {
            const dx = Math.abs(position.x - plot.position.x);
            const dz = Math.abs(position.z - plot.position.z);
            if (dx < plot.size.width / 2 && dz < plot.size.depth / 2) {
                return plot;
            }
        }
        return null;
    }

    interactWithPlot(plotId) {
        const plot = this.plots.get(plotId);
        if (!plot) return;

        // Check if plot is owned by this player
        if (plot.owner && plot.owner === this.userId) {
            this.showNotification('¡Ya eres dueño de este terreno!', 'info');
            return;
        }

        // Check if plot is owned by another player
        if (plot.owner && plot.owner !== this.userId) {
            this.showNotification('Este terreno ya está ocupado por otro jugador', 'warning');
            return;
        }

        // Plot is available for purchase/rent
        this.currentInteractionPlotId = plotId;
        this.openModal(plot);
    }

    openModal(plot) {
        const modal = document.getElementById('land-transaction-modal');
        const info = document.getElementById('plot-info');
        const buyBtn = document.getElementById('btn-buy');

        info.innerHTML = `
            <div><strong>Lote ID:</strong> ${plot.id}</div>
            <div style="font-size: 1.5em; color: #ffd700; margin: 10px 0;">$${this.formatMoney(plot.price)}</div>
            <div style="font-size: 0.8em; color: #aaa;">Tamaño: ${plot.size.width}x${plot.size.depth}m</div>
        `;

        buyBtn.onclick = () => this.buyPlot(plot.id);

        // Update rent buttons with prices
        document.querySelectorAll('.rent-opt').forEach(btn => {
            const type = btn.dataset.type;
            const opt = this.rentOptions[type];
            const rentPrice = Math.floor(plot.price * opt.priceMultiplier);
            btn.innerHTML = `${opt.label}<br><small>$${this.formatMoney(rentPrice)}</small>`;
        });

        modal.style.display = 'block';

        // Unlock pointer lock to allow clicking
        document.exitPointerLock();
    }

    closeModal() {
        document.getElementById('land-transaction-modal').style.display = 'none';
        document.getElementById('rent-options').style.display = 'none';
        // Request pointer lock again if needed, or let user click to resume
    }

    buyPlot(plotId) {
        const plot = this.plots.get(plotId);
        if (this.playerWallet >= plot.price) {
            this.playerWallet -= plot.price;
            this.updateWalletUI();

            plot.owner = this.userId; // Use real userId
            plot.rentExpires = null;
            this.updatePlotVisuals(plotId);

            this.closeModal();
            this.showNotification(`🎉 ¡Felicidades! Has comprado el terreno`, 'success');
        } else {
            this.showNotification('💰 Fondos insuficientes para comprar', 'error');
        }
    }

    rentPlot(plotId, durationType) {
        const plot = this.plots.get(plotId);
        const option = this.rentOptions[durationType];
        const rentPrice = Math.floor(plot.price * option.priceMultiplier);

        if (this.playerWallet >= rentPrice) {
            this.playerWallet -= rentPrice;
            this.updateWalletUI();

            plot.owner = this.userId; // Use real userId
            plot.rentExpires = Date.now() + option.duration;
            this.updatePlotVisuals(plotId);

            this.closeModal();
            this.showNotification(`📅 Terreno rentado por ${option.label}`, 'success');
        } else {
            this.showNotification('💰 Fondos insuficientes para rentar', 'error');
        }
    }

    updatePlotVisuals(plotId) {
        const plot = this.plots.get(plotId);
        if (!plot) return;

        // Color scheme:
        // Green = Owned by me (purchased)
        // Yellow = Rented by me
        // Purple = Owned by other player
        // Cyan/Blue = For Sale

        let borderColor, groundColor, signColor;

        if (plot.owner === this.userId) {
            // Owned by current player
            if (plot.rentExpires) {
                // Rented (temporary)
                borderColor = 0xffff00; // Yellow
                groundColor = 0xffff00;
                signColor = 0xffaa00;
            } else {
                // Owned (permanent)
                borderColor = 0x00ff00; // Green
                groundColor = 0x00ff00;
                signColor = 0x00aa00;
            }
        } else if (plot.owner) {
            // Owned by another player
            borderColor = 0xff00ff; // Purple/Magenta
            groundColor = 0x8800ff;
            signColor = 0xaa00aa;
        } else {
            // For sale
            borderColor = 0x00ffff; // Cyan
            groundColor = 0x0088ff; // Blue
            signColor = 0xff3333; // Red
        }

        // Update ground plane
        if (plot.mesh) {
            plot.mesh.material.color.setHex(groundColor);
            plot.mesh.material.opacity = plot.owner === this.userId ? 0.3 : 0.1;
        }

        // Update border
        if (plot.borderGroup) {
            plot.borderGroup.children.forEach(edge => {
                edge.material.color.setHex(borderColor);
                edge.material.opacity = plot.owner === this.userId ? 1.0 : 0.8;
            });
        }

        // Update sign
        if (plot.signMesh) {
            plot.signMesh.material.color.setHex(signColor);
            plot.signMesh.material.emissive.setHex(signColor);
            plot.signMesh.material.emissiveIntensity = plot.owner === this.userId ? 0.3 : 0.6;
        }
    }

    updateWalletUI() {
        document.getElementById('wallet-balance').innerText = this.formatMoney(this.playerWallet);
    }

    formatMoney(amount) {
        return amount.toLocaleString('en-US');
    }

    checkRentExpirations() {
        const now = Date.now();
        for (const [id, plot] of this.plots) {
            // Only check expiration for plots owned by this user
            if (plot.owner === this.userId && plot.rentExpires && now > plot.rentExpires) {
                plot.owner = null;
                plot.rentExpires = null;
                this.updatePlotVisuals(id);
                console.log(`Renta expirada para lote ${id}`);
                // Optional: Notify user
            }
        }
    }

    // Call this in game loop
    update() {
        // Check expirations every minute or so, not every frame
        if (Math.random() < 0.001) this.checkRentExpirations();
    }

    exportData() {
        // Export ALL plots with ownership info for multiplayer sync
        const plotsData = [];
        for (const [id, plot] of this.plots) {
            if (plot.owner) {
                plotsData.push({
                    id: plot.id,
                    owner: plot.owner, // Store actual userId
                    rentExpires: plot.rentExpires
                });
            }
        }
        return {
            wallet: this.playerWallet,
            plots: plotsData // Changed from ownedPlots to plots
        };
    }

    importData(data) {
        if (!data) return;

        if (data.wallet !== undefined) {
            this.playerWallet = data.wallet;
            this.updateWalletUI();
        }

        // Import plots data (compatibility with both old and new format)
        const plotsToImport = data.plots || data.ownedPlots || [];

        plotsToImport.forEach(savedPlot => {
            const plot = this.plots.get(savedPlot.id);
            if (plot) {
                plot.owner = savedPlot.owner || this.userId; // Use saved owner or current userId
                plot.rentExpires = savedPlot.rentExpires;
                this.updatePlotVisuals(savedPlot.id);
            }
        });
    }
}
