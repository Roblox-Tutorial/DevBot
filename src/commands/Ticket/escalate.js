const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    // ⚙️ Configurations requises par le gestionnaire (Command Handler) de TitanBot
    category: 'tickets',
    permissions: {
        client: [PermissionFlagsBits.ManageChannels], // Le bot doit pouvoir modifier les permissions
        user: [PermissionFlagsBits.ManageChannels],   // L'utilisateur doit être un modérateur/admin
    },

    // 📋 Déclaration de la commande slash auprès de l'API Discord
    data: new SlashCommandBuilder()
        .setName('escalatem')
        .setDescription('Escalade le ticket au Moderation Department')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    // 🚀 Logique d'exécution de la commande
    async execute(interaction) {
        // 1. Protection : On s'assure que la commande n'est pas lancée en DM (messages privés)
        if (!interaction.guild) {
            return interaction.reply({ 
                content: "❌ Cette commande ne peut être exécutée que dans un serveur.", 
                ephemeral: true 
            });
        }

        // 2. Recherche du rôle requis par son nom exact
        const targetRoleName = "Moderation Department";
        const modRole = interaction.guild.roles.cache.find(role => role.name === targetRoleName);

        // Si le rôle n'existe pas sur le serveur Discord, on arrête tout proprement pour éviter un crash
        if (!modRole) {
            return interaction.reply({ 
                content: `❌ Le rôle nommé **"${targetRoleName}"** est introuvable.\nVeuillez vérifier son orthographe exacte (respectez les majuscules) dans les paramètres de votre serveur Discord.`, 
                ephemeral: true 
            });
        }

        try {
            // 3. Application des nouvelles permissions de salon (Permission Overwrites)
            // Donne l'accès complet de lecture, d'écriture et d'historique au Moderation Department
            await interaction.channel.permissionOverwrites.edit(modRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            // 4. Message de confirmation exact exigé
            await interaction.reply({ 
                content: "*escalation succesfully*" 
            });

            // 5. Ajout d'un embed (Optionnel mais recommandé pour avertir proprement le staff dans le salon)
            const logEmbed = new EmbedBuilder()
                .setColor(0x2F3136) // Couleur sombre élégante
                .setTitle('🎫 Escalade de Ticket')
                .setDescription(`Le salon a été ouvert avec succès. Les membres du rôle ${modRole} peuvent désormais voir, interagir et traiter ce ticket.`)
                .setTimestamp()
                .setFooter({ text: `Action effectuée par ${interaction.user.tag}` });

            await interaction.channel.send({ embeds: [logEmbed] }).catch(() => null);

        } catch (error) {
            console.error("Une erreur s'est produite lors de l'exécution de /escalatem:", error);

            // Gestion d'erreur en cas de manque de permissions du bot
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: "❌ Une erreur interne est survenue lors de la configuration des permissions.", 
                    ephemeral: true 
                }).catch(() => null);
            } else {
                await interaction.reply({ 
                    content: "❌ Le bot n'a pas les autorisations système nécessaires pour modifier les permissions de ce salon.", 
                    ephemeral: true 
                }).catch(() => null);
            }
        }
    },
};
