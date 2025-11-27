/**
 * @file CardEditorController.svelte.ts
 * @module editor
 * @description
 * Controller for the CardEditorPanel component. Encapsulates business logic,
 * drag-and-drop state, and DOM interactions.
 */

import { tick } from 'svelte';
import { cardEditorState, updateCard, addCard as addCardToStore, deleteCard, restoreCard, close } from './cardEditorStore.svelte';
import { debounce } from '$lib/core/utils/debounce';
import type { SRS } from '$lib/types';
import { toast } from 'svelte-sonner';
import { i18n } from '$lib/utils/i18n.svelte';

type Card = SRS.Card;
type CardType = Card['type'];

export class CardEditorController {
    // Drag and Drop State
    draggedItemIndex = $state<number | null>(null);
    dropTargetIndex = $state<number | null>(null);

    // UI State
    showAddMenu = $state(false);
    
    // DOM References
    cardElements = new Map<string, HTMLElement>();

    // Debounced updaters map to prevent data loss between different cards
    private updateHandlers = new Map<string, (card: Card) => void>();

    constructor() {
        // React to new cards being added to scroll them into view
        $effect(() => {
            const newCardId = cardEditorState.lastAddedCardId;
            if (newCardId) {
                this.scrollToCard(newCardId);
            }
        });
    }

    registerElement(node: HTMLElement, id: string) {
        this.cardElements.set(id, node);
        return {
            destroy: () => {
                this.cardElements.delete(id);
            },
        };
    }

    async scrollToCard(cardId: string) {
        await tick(); // Wait for DOM update
        const element = this.cardElements.get(cardId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const firstInput = element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    handleUpdate(card: Card) {
        let handler = this.updateHandlers.get(card.id);
        if (!handler) {
            handler = debounce((c: Card) => updateCard(c), 500);
            this.updateHandlers.set(card.id, handler);
        }
        handler(card);
    }

    handleAddCard(type: CardType) {
        addCardToStore(type);
        this.showAddMenu = false;
    }

    async handleRemoveCard(cardId: string) {
        const deletedCard = await deleteCard(cardId);
        if (deletedCard) {
            toast.success(i18n.t('card_editor_panel.card_deleted_toast'), {
                action: {
                    label: i18n.t('card_editor_panel.undo_button'),
                    onClick: () => restoreCard(deletedCard),
                },
            });
        }
    }

    addSequenceItem(card: Card) {
        if (card.type === 'sequencing') {
            card.content.items = [...card.content.items, ''];
            this.handleUpdate(card);
        }
    }

    removeSequenceItem(card: Card, itemIndex: number) {
        if (card.type === 'sequencing') {
            card.content.items = card.content.items.filter((_, i) => i !== itemIndex);
            this.handleUpdate(card);
        }
    }

    // --- Drag and Drop Logic ---

    handleDragStart(index: number, event: DragEvent) {
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        this.draggedItemIndex = index;
    }

    handleDragOver(targetIndex: number, event: DragEvent) {
        event.preventDefault();
        if (this.draggedItemIndex !== targetIndex) {
            this.dropTargetIndex = targetIndex;
        }
    }

    handleDrop(targetIndex: number, card: Card) {
        if (
            card.type !== 'sequencing' ||
            this.draggedItemIndex === null ||
            this.draggedItemIndex === targetIndex
        ) {
            this.resetDragState();
            return;
        }
        const newItems = [...card.content.items];
        const [draggedItem] = newItems.splice(this.draggedItemIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);
        card.content.items = newItems;
        this.handleUpdate(card);
        this.resetDragState();
    }

    resetDragState() {
        this.draggedItemIndex = null;
        this.dropTargetIndex = null;
    }

    closePanel() {
        close();
    }
}
