const { SlashCommandBuilder, EmbedBuilder, time, version } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Affiche un rapport système complet et les informations cruciales du serveur.'),

    async execute(interaction) {
        const { guild, client } = interaction;

        // Éviter le timeout si la base de données ou les bans mettent du temps à répondre
        await interaction.deferReply();

        try {
            // 1. STATISTIQUES ET SÉCURITÉ DU SERVEUR
            const memberCount = guild.memberCount;
            const creationDate = guild.createdAt;
            const iconUrl = guild.iconURL({ dynamic: true }) || null;
            
            // Séparation précise des salons pour le debug
            const totalChannels = guild.channels.cache.size;
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // Text
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // Voice
            const categories = guild.channels.cache.filter(c => c.type === 4).size; // Category

            const guildOwner = await guild.fetchOwner();
            
            // Récupération sécurisée du nombre de bans
            let banCount = 'Inconnu (Permissions manquantes)';
            try {
                const bans = await guild.bans.fetch({ limit: 1 });
                banCount = guild.bans.cache.size || 'Vérification requise';
            } catch (e) {
                // Pas de permission de voir les bans
            }

            // Niveau de vérification de sécurité du serveur
            const verificationLevels = ['Aucun', 'Faible (Email vérifié)', 'Moyen (Inscrit depuis 5 min)', 'Élevé (Sur le serveur depuis 10 min)', 'Maximum (Téléphone vérifié)'];
            const safetyLevel = verificationLevels[guild.verificationLevel] || 'Inconnu';

            // 2. DONNÉES DE DÉBOGAGE DU BOT & SYSTÈME
            const apiPing = client.ws.ping;
            const botPing = Date.now() - interaction.createdTimestamp;
            
            // Consommation RAM du Bot (en MB)
            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

            // Statut de la base de données (PostgreSQL de votre projet DevBot)
            let dbStatus = '🟢 Connectée';
            if (client.db && typeof client.db.query !== 'function') {
                dbStatus = '🔴 Déconnectée ou Erreur de driver';
            }

            // 3. TRAITEMENT DE LA LISTE DES RÔLES (Hiérarchie)
            const roles = guild.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position);

            let rolesDisplay = roles.map(role => role.toString()).join(', ');
            if (rolesDisplay.length > 1000) {
                rolesDisplay = rolesDisplay.substring(0, 980) + '... (Liste trop longue)';
            }
            if (roles.size === 0) rolesDisplay = 'Aucun rôle';

            // 4. CONSTRUCTION DE L'EMBED TECHNIQUE
            const debugEmbed = new EmbedBuilder()
                .setTitle(`🛠️ Rapport d'Information & Debug : ${guild.name}`)
                .setColor('#5865F2')
                .setThumbnail(iconUrl)
                .setDescription(`Rapport système généré pour analyser la santé du serveur et du bot.`)
                
                // Section 1 : Données du serveur
                .addFields(
                    { name: '👑 Identité du Serveur', value: `**Propriétaire :** ${guildOwner.user.tag} (\`${guildOwner.id}\`)\n**ID du Serveur :** \`${guild.id}\`\n**Créé le :** ${time(creationDate, 'D')} (${time(creationDate, 'R')})`, inline: false },
                    
                    { name: '📊 Statistiques Globales', value: `👥 **Membres :** ${memberCount}\n🚫 **Utilisateurs Bannis :** ${banCount}\n✨ **Boosts :** Niveau ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)\n🛡️ **Sécurité :** ${safetyLevel}`, inline: true },
                    
                    { name: '📁 Structure des Salons', value: `🌐 **Total :** ${totalChannels}\n💬 **Textuels :** ${textChannels}\n🔊 **Vocaux :** ${voiceChannels}\n🗂️ **Catégories :** ${categories}`, inline: true }
                )
                
                // Section 2 : Métriques de Debug (Bot, RAM, Réseau)
                .addFields(
                    { name: '⚙️ Performance & Diagnostic Web', value: `⚡ **Ping API Discord :** \`${apiPing}ms\`\n⏱️ **Temps de Réponse Bot :** \`${botPing}ms\`\n💾 **Mémoire RAM Bot :** \`${memoryUsage} MB\`\n🗄️ **Base de données :** ${dbStatus}`, inline: false },
                    
                    { name: '📦 Environnement Logiciel', value: `🤖 **Discord.js :** \`v${version}\`\n🟢 **Node.js :** \`${process.version}\`\n💻 **OS :** \`${os.platform()} (${os.arch()})\``, inline: false },
                    
                    // Section 3 : Les Rôles
                    { name: `📜 Liste des rôles configurés (${roles.size})`, value: rolesDisplay, inline: false }
                )
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // Envoi du rapport complet
            await interaction.editReply({ embeds: [debugEmbed] });

        } catch (error) {
            console.error("Erreur critique dans la commande /info :", error);
            if (interaction.deferred) {
                await interaction.editReply({ content: "❌ Une erreur interne est survenue lors de la compilation des données de debug." });
            }
        }
    },
};
