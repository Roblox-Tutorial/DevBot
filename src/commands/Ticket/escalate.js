import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// Put your actual role ID here (Moderation Department)
const MOD_DEPARTMENT_ROLE_ID = '1506843456943689798';

// Optional: if all ticket channels are in one category, put that ID here
const TICKET_CATEGORY_ID = '1506636010866479114';

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

      // --- Get Moderation Department role ---
      const modRole =
        guild.roles.cache.get(MOD_DEPARTMENT_ROLE_ID) ||
        guild.roles.cache.find((r) => r.name === 'Moderation Department');

      if (!modRole) {
        await InteractionHelper.safeEditReply(interaction, {
          content:
            'Moderation Department role not found. Please check the configuration.'
        });

        logger.error('Moderation Department role not found for escalate command', {
          guildId: interaction.guildId,
          commandName: 'escalate'
        });
        return;
      }

      // --- Build embed for the ticket channel ---
      const embed = createEmbed({
        title: 'Ticket escalated'
      }).setDescription(
        `This ticket has been escalated to ${modRole}.`
      );

      // --- Notify moderation department in the ticket channel ---
      await channel.send({
        content: `<@&${modRole.id}>`,
        embeds: [embed]
      });

      // --- Confirm to the user who ran /escalate ---
      await InteractionHelper.safeEditReply(interaction, {
        content:
          'Command ran successfully. The moderation department has been notified.'
      });

      logger.info('Escalate command executed', {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: channel.id,
        modRoleId: modRole.id,
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
