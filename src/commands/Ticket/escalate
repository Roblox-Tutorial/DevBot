const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escalatem')
        .setDescription('Escalade le ticket au Moderation Department')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Limite la commande au staff ayant accès aux salons

    async execute(interaction) {
        // 1. Vérification que la commande est bien tapée dans un salon textuel du serveur
        if (!interaction.guild) {
            return interaction.reply({ 
                content: "Cette commande ne peut être exécutée que dans un serveur.", 
                ephemeral: true 
            });
        }

        // 2. Recherche du rôle "Moderation Department" par son nom exact
        const targetRoleName = "Moderation Department";
        const modRole = interaction.guild.roles.cache.find(role => role.name === targetRoleName);

        if (!modRole) {
            return interaction.reply({ 
                content: `❌ Le rôle nommé **"${targetRoleName}"** est introuvable. Veuillez vérifier l'orthographe exacte dans les paramètres de votre serveur.`, 
                ephemeral: true 
            });
        }

        try {
            // 3. Modification des permissions du salon actuel (Permission Overwrites)
            // Donne l'accès pour Voir (ViewChannel), Parler/Répondre (SendMessages) et Lire l'historique (ReadMessageHistory)
            await interaction.channel.permissionOverwrites.edit(modRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            // 4. Envoi du message de confirmation exact
            // Note : Comme requis pour le système de ticket du bot, ce message confirme le succès de l'opération
            await interaction.reply({ 
                content: "*escalation succesfully*" 
            });

            // Optionnel (Bonus visuel) : Envoi d'un bel embed pour avertir le staff
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎫 Ticket Escaladé')
                .setDescription(`Le salon a été ouvert avec succès aux membres possédant le rôle ${modRole}.`)
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] }).catch(() => null);

        } catch (error) {
            console.error("Erreur lors de l'exécution de /escalatem:", error);
            
            // Gestion d'erreur propre si le bot n'a pas les permissions requises
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "❌ Une erreur est survenue lors de la configuration des permissions.", ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ Le bot n'a pas les permissions nécessaires pour modifier ce salon.", ephemeral: true });
            }
        }
    },
};
