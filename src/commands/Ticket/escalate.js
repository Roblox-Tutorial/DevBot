import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// IDs to configure for your server
const SUPPORT_ROLE_ID = '1506631605576270004';       // Support role ID
const MOD_DEPARTMENT_ROLE_ID = '1506843456943689798'; // Moderation Department role ID
const TICKET_CATEGORY_ID = '1506636010866479114';     // Ticket category ID (optional)

export default {
  data: new SlashCommandBuilder()
    .setName('escalate')
    .setDescription('Escalate this ticket to the moderation department'),

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);
      if (!deferSuccess) {
        logger.warn('Escalate interaction defer failed', {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          commandName: 'escalate'
        });
        return;
      }

      const channel = interaction.channel;
      const guild = interaction.guild;

      // --- Ticket detection logic (adjust to your system) ---
      const isTicketByCategory =
        TICKET_CATEGORY_ID && channel.parentId === TICKET_CATEGORY_ID;

      const isTicketByName =
        channel.name && channel.name.toLowerCase().startsWith('ticket-');

      const isTicketChannel = isTicketByCategory || isTicketByName;

      if (!isTicketChannel) {
        await InteractionHelper.safeEditReply(interaction, {
          content: 'This command can only be used in ticket channels.'
        });

        logger.info('Escalate command used outside ticket channel', {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          channelId: channel.id,
          commandName: 'escalate'
        });
        return;
      }

      // --- Get roles ---
      const supportRole =
        guild.roles.cache.get(SUPPORT_ROLE_ID) ||
        guild.roles.cache.find((r) => r.id === SUPPORT_ROLE_ID);

      const modRole =
        guild.roles.cache.get(MOD_DEPARTMENT_ROLE_ID) ||
        guild.roles.cache.find((r) => r.id === MOD_DEPARTMENT_ROLE_ID);

      if (!supportRole) {
        await InteractionHelper.safeEditReply(interaction, {
          content: 'Support role not found. Please check the configuration.'
        });

        logger.error('Support role not found for escalate command', {
          guildId: interaction.guildId,
          commandName: 'escalate'
        });
        return;
      }

      if (!modRole) {
        await InteractionHelper.safeEditReply(interaction, {
          content: 'Moderation Department role not found. Please check the configuration.'
        });

        logger.error('Moderation Department role not found for escalate command', {
          guildId: interaction.guildId,
          commandName: 'escalate'
        });
        return;
      }

      // --- 1) Remove support role permissions in this ticket channel ---
      await channel.permissionOverwrites.edit(supportRole, {
        ViewChannel: false,
        SendMessages: false
      });

      // --- 2) Add moderation department permissions in this ticket channel ---
      await channel.permissionOverwrites.edit(modRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      // --- 3) Add letter "a" to the ticket channel name ---
      const currentName = channel.name || 'ticket';
      const newName = currentName + 'mod';

      await channel.setName(newName, 'Escalated ticket to moderation department');

      // --- 4) Build embed + notify moderation in the ticket channel ---
      const embed = createEmbed({
        title: 'Ticket escalated'
      }).setDescription(
        `This ticket has been escalated to the ${modRole}.`
      );

      await channel.send({
        content: `<@&${modRole.id}>`,
        embeds: [embed]
      });

      // --- 5) Confirm to the user who ran /escalate ---
      

      logger.info('Escalate command executed', {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: channel.id,
        supportRoleId: supportRole.id,
        modRoleId: modRole.id,
        oldChannelName: currentName,
        newChannelName: newName,
        commandName: 'escalate'
      });
    } catch (error) {
      logger.error('Escalate command execution failed', {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'escalate'
      });

      await handleInteractionError(interaction, error, {
        commandName: 'escalate',
        source: 'escalate_command'
      });
    }
  }
};
