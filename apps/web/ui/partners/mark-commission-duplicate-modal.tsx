import { markCommissionDuplicateAction } from "@/lib/actions/partners/mark-commission-duplicate";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { Button, Modal, StatusBadge } from "@dub/ui";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomerRowItem } from "../customers/customer-row-item";
import { CommissionStatusBadges } from "./commission-status-badges";
import { CommissionTypeBadge } from "./commission-type-badge";
import { PartnerRowItem } from "./partner-row-item";

interface ModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  commission: CommissionResponse;
}

function MarkCommissionDuplicateModal({
  showModal,
  setShowModal,
  commission,
}: ModalProps) {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <ModalInner setShowModal={setShowModal} commission={commission} />
    </Modal>
  );
}

function ModalInner({
  setShowModal,
  commission,
}: Omit<ModalProps, "showModal">) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams<{ programId: string }>();

  const { executeAsync, isExecuting, hasSucceeded } = useAction(
    markCommissionDuplicateAction,
    {
      onSuccess: async () => {
        toast.success("Successfully marked commission as duplicate.");
        await mutatePrefix([
          "/api/commissions",
          `/api/programs/${programId}/payouts`,
        ]);
        setShowModal(false);
      },
      onError: () => {
        toast.error("Failed to update commission status.");
      },
    },
  );

  const commissionItem = useMemo(() => {
    const badge = CommissionStatusBadges[commission.status];

    return {
      Date: new Date(commission.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),

      Customer: (
        <CustomerRowItem
          customer={commission.customer!}
          avatarClassName="size-5"
        />
      ),

      Partner: (
        <PartnerRowItem
          partner={commission.partner!}
          showPayoutsEnabled={false}
          showPermalink={false}
        />
      ),

      Type: <CommissionTypeBadge type={commission.type!} />,

      Amount:
        commission.type === "sale"
          ? currencyFormatter(commission.amount / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : nFormatter(commission.quantity),

      Commission: currencyFormatter(commission.earnings / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),

      Status: (
        <StatusBadge icon={null} variant={badge.variant}>
          {badge.label}
        </StatusBadge>
      ),
    };
  }, [commission]);

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Mark commission as duplicate
        </h3>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-900">
            <span className="font-bold">Warning:</span> This will mark the
            commission as duplicate and remove it from any upcoming payouts.
            This action cannot be undone.
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-y-4">
            {Object.entries(commissionItem).map(([key, value]) => (
              <React.Fragment key={key}>
                <div className="text-sm font-medium text-neutral-500">
                  {key}
                </div>
                <div className="text-sm font-medium text-neutral-800">
                  {value}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isExecuting}
        />
        <Button
          onClick={async () => {
            if (!workspaceId || !programId) {
              return;
            }

            await executeAsync({
              workspaceId,
              commissionId: commission.id,
            });
          }}
          autoFocus
          variant="danger"
          loading={isExecuting || hasSucceeded}
          text="Mark as duplicate"
          className="h-8 w-fit px-3"
        />
      </div>
    </>
  );
}

export function useMarkCommissionDuplicateModal({
  commission,
}: {
  commission: CommissionResponse;
}) {
  const [showModal, setShowModal] = useState(false);

  const ModalCallback = useCallback(() => {
    return (
      <MarkCommissionDuplicateModal
        showModal={showModal}
        setShowModal={setShowModal}
        commission={commission}
      />
    );
  }, [showModal, setShowModal, commission]);

  return useMemo(
    () => ({
      setShowModal,
      MarkCommissionDuplicateModal: ModalCallback,
    }),
    [setShowModal, ModalCallback],
  );
}
