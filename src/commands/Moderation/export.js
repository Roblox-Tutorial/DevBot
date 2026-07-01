const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exportbans')
        .setDescription('Exporte la liste des bannissements du serveur au format JSON.')
        // Restreint la commande nativement aux modérateurs ayant la permission de bannir
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Sécurité supplémentaire : vérification de la permission du membre au moment de l'exécution
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ 
                content: "❌ Vous devez disposer de la permission de bannir des membres pour utiliser cette commande.", 
                ephemeral: true 
            });
        }

        // Différer la réponse car la récupération de gros volumes de bans peut prendre du temps
        await interaction.deferReply({ ephemeral: true });

        try {
            // Récupération des bannissements du serveur
            const bans = await interaction.guild.bans.fetch();
            
            if (bans.size === 0) {
                return interaction.editReply({ content: "ℹ️ Aucun utilisateur n'est actuellement banni de ce serveur." });
            }

            const banList = [];

            // Traitement et structuration des données
            for (const [userId, banInfo] of bans) {
                // Récupération des logs d'audit pour trouver l'auteur et la date du ban
                const auditLogs = await interaction.guild.fetchAuditLogs({
                    limit: 1,
                    type: 22, // 22 = MEMBER_BAN_ADD
                    targetId: userId
                });
                
                const banLog = auditLogs.entries.first();
                
                let bannedBy = "Inconnu (Log expiré ou introuvable)";
                let bannedAt = "Inconnue";

                if (banLog && banLog.target.id === userId) {
                    bannedBy = `${banLog.executor.tag} (${banLog.executor.id})`;
                    bannedAt = banLog.createdAt.toISOString();
                }

                banList.push({
                    banned_user: {
                        id: banInfo.user.id,
                        username: banInfo.user.username,
                        tag: banInfo.user.tag
                    },
                    banned_by: bannedBy,
                    banned_at: bannedAt,
                    reason: banInfo.reason || "Aucune raison fournie"
                });
            }

            // Génération et conversion en buffer du fichier JSON
            const jsonBuffer = Buffer.from(JSON.stringify(banList, null, 4), 'utf-8');
            const attachment = new AttachmentBuilder(jsonBuffer, { name: `bans-export-${interaction.guild.id}.json` });

            // Construction de l'embed de confirmation
            const embed = new EmbedBuilder()
                .setTitle('📊 Exportation des Bannissements Réussie')
                .setDescription(`Le fichier JSON contenant les **${banList.length}** bannissements a été généré avec succès.`)
                .setColor('#2b2d31')
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error("Erreur lors de l'exportation des bannissements :", error);
            await interaction.editReply({ content: "❌ Une erreur est survenue lors de la récupération ou de la création de l'export." });
        }
    },
};
