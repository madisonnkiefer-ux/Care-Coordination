"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { FloatingSaveBar } from "@/components/floating-save-bar";
import { SimpleHistoryBar } from "@/components/intake/versioning";
import { TextArea, TextField, DateField, Checkbox, CheckboxGroup } from "@/components/intake/form-fields";
import { PREFERRED_CONTACT_METHOD_OPTIONS, DISASTER_REVIEW_ITEMS_OPTIONS } from "@/components/intake/options";
import { RepeatableRows } from "@/components/care-plan/repeatable-rows";
import { GoalCard } from "@/components/care-plan/goal-card";
import { createNewCarePlan, saveCarePlan, addGoal } from "@/app/actions/care-plan";
import { deleteCarePlan } from "@/app/actions/delete";
import type {
  CarePlan,
  CarePlanTeamMember,
  CarePlanMedication,
  CarePlanBackupContact,
  CarePlanDisasterContact,
  CarePlanGoal,
  CarePlanProgressNote,
} from "@/app/generated/prisma/client";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";
import { FormFieldsProvider } from "@/lib/form-fields/context";
import { CustomQuestionsSection } from "@/components/intake/custom-questions-section";
import { mergeCustomQuestions, type CustomQuestionDef } from "@/lib/custom-questions-shared";
import { OrderedStack } from "@/components/intake/ordered-items";

type CarePlanRecord = CarePlan & {
  teamMembers: CarePlanTeamMember[];
  medications: CarePlanMedication[];
  backupContacts: CarePlanBackupContact[];
  disasterContacts: CarePlanDisasterContact[];
  goals: (CarePlanGoal & { progressNotes: CarePlanProgressNote[] })[];
};

function toInputDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
}

export function CcpTab({
  memberId,
  records,
  defaultVersionId,
  currentUserIsAdmin,
  fields,
  fieldOrder,
  customQuestionDefs,
  customAnswersByRecord,
}: {
  memberId: string;
  records: CarePlanRecord[];
  defaultVersionId?: string;
  currentUserIsAdmin?: boolean;
  fields: ResolvedFormFields;
  fieldOrder: string[];
  customQuestionDefs: CustomQuestionDef[];
  customAnswersByRecord: Record<string, Record<string, unknown>>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultVersionId ?? records[0]?.id ?? null);
  const plan = records.find((r) => r.id === selectedId) ?? records[0] ?? null;
  const customQuestions = plan ? mergeCustomQuestions(customQuestionDefs, customAnswersByRecord[plan.id]) : [];

  const historyItems = records.map((r) => ({ id: r.id, dateLabel: r.createdAt }));

  return (
    <FormFieldsProvider form="ccp" fields={fields}>
    <div className="p-8">
      <SimpleHistoryBar
        items={historyItems}
        selectedId={plan?.id ?? null}
        onSelect={setSelectedId}
        newAction={createNewCarePlan.bind(null, memberId)}
        newLabel="+ New CCP"
        onDelete={currentUserIsAdmin ? deleteCarePlan.bind(null, memberId) : undefined}
      />

      {!plan ? (
        <p className="text-sm text-stone-600">No Comprehensive Care Plan yet — click &quot;+ New CCP&quot; to start one.</p>
      ) : (
        <div className="max-w-4xl space-y-6">
          <form
            key={`${plan.id}-${plan.updatedAt.getTime()}`}
            id="ccp-form"
            action={saveCarePlan.bind(null, memberId, plan.id)}
            className="space-y-6"
          >
            <Card title="Demographic Information">
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.ccpStartDate",
                    el: <DateField name="ccpStartDate" label="CCP Start Date" defaultValue={toInputDate(plan.ccpStartDate)} />,
                  },
                  {
                    key: "ccp.mostRecentCnaCompletionDate",
                    el: (
                      <DateField
                        name="mostRecentCnaCompletionDate"
                        label="Most Recent CNA Completion Date"
                        defaultValue={toInputDate(plan.mostRecentCnaCompletionDate)}
                      />
                    ),
                  },
                  {
                    key: "ccp.preferredContactMethod",
                    el: (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-600">Preferred Method of Contact</p>
                        <div className="flex flex-wrap gap-6">
                          {(fields["ccp.preferredContactMethod"]?.options ?? PREFERRED_CONTACT_METHOD_OPTIONS).map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm text-stone-600">
                              <input type="radio" name="preferredContactMethod" value={opt} defaultChecked={plan.preferredContactMethod === opt} className="h-4 w-4" />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Interdisciplinary Care Team (ICT) Information" className="overflow-visible">
              <p className="mb-3 text-xs text-stone-600">Power of Attorney, parent, spouse, partner, providers, natural supports, etc. — if applicable.</p>
              <RepeatableRows
                initialRows={plan.teamMembers}
                minRows={1}
                addLabel="+ Add ICT Team Member"
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                    <TextField name="name" label="Name/Title" defaultValue={row.name} />
                    <TextField name="phone" label="Phone" defaultValue={row.phone} />
                    <TextField name="email" label="Email" defaultValue={row.email} />
                    <TextField name="relation" label="Relation to Member" defaultValue={row.relation} />
                    <TextField name="specialty" label="Specialty (if applicable)" defaultValue={row.specialty} />
                  </div>
                )}
              />
            </Card>

            <Card title="Services that will be Authorized by the MCO">
              <p className="mb-2 text-xs text-stone-600">Including amount, frequency, duration and scope (tasks and functions to be performed) of each service to be provided.</p>
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.servicesAuthorizedByMco",
                    el: <TextArea name="servicesAuthorizedByMco" label="Services authorized by the MCO" defaultValue={plan.servicesAuthorizedByMco} rows={4} />,
                  },
                ]}
              />
            </Card>

            <Card title="Physical Health (PH) and Behavioral Health (BH) Conditions/Diagnoses">
              <p className="mb-2 text-xs text-stone-600">
                Conditions, needs and functional status; relevant information regarding the Member&apos;s PH and BH condition(s), including treatment needed by a
                Provider, caregiver, or the care coordinator to ensure appropriate delivery of services or coordination of care.
              </p>
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.phBhConditions",
                    el: <TextArea name="phBhConditions" label="PH and BH conditions/diagnoses" defaultValue={plan.phBhConditions} rows={4} />,
                  },
                ]}
              />
            </Card>

            <Card title="Medications">
              <p className="mb-3 text-xs text-stone-600">Including names, dosages, frequency, and discontinued medications.</p>
              <RepeatableRows
                initialRows={plan.medications.map((m) => ({ ...m, startDate: toInputDate(m.startDate), endDate: toInputDate(m.endDate) }))}
                minRows={1}
                addLabel="+ Add Medication"
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                    <TextField name="name" label="Medication" defaultValue={row.name} />
                    <TextField name="dosage" label="Dosage" defaultValue={row.dosage} />
                    <TextField name="frequency" label="Frequency" defaultValue={row.frequency} />
                    <DateField name="startDate" label="Start Date" defaultValue={row.startDate as string | null} />
                    <DateField name="endDate" label="Discontinued Date" defaultValue={row.endDate as string | null} />
                  </div>
                )}
              />
            </Card>

            <Card title="Backup Plan">
              <p className="mb-3 text-xs text-stone-600">
                I will talk with backup paid or unpaid caregivers about when they are available and my care needs before a situation comes up. I will call one
                of the people listed below if my scheduled paid or unpaid caregiver does not show up at his/her scheduled time.
              </p>
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.backupPlanText",
                    el: (
                      <div>
                        <RepeatableRows
                          initialRows={plan.backupContacts}
                          minRows={1}
                          addLabel="+ Add Backup Contact"
                          renderRow={(row) => (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                              <TextField name="name" label="Name" defaultValue={row.name} />
                              <TextField name="phone" label="Phone" defaultValue={row.phone} />
                              <TextField name="address" label="Address" defaultValue={row.address} />
                              <TextField name="relationship" label="Relationship" defaultValue={row.relationship} />
                            </div>
                          )}
                        />
                        <div className="mt-4">
                          <TextArea
                            name="backupPlanText"
                            label="This is my plan in case my caregiver(s) don't show up and I can't reach one of the people listed above"
                            defaultValue={plan.backupPlanText}
                            rows={3}
                          />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Disaster Preparedness Plan">
              <p className="mb-3 text-xs text-stone-600">
                I will make and post a list of emergency contacts that my providers can easily find in the event of an unsafe or harmful situation.
              </p>
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.disasterPlanText",
                    el: (
                      <div>
                        <RepeatableRows
                          initialRows={plan.disasterContacts}
                          minRows={1}
                          addLabel="+ Add Disaster Contact"
                          renderRow={(row) => (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <TextField name="name" label="Name" defaultValue={row.name} />
                              <TextField name="phone" label="Phone" defaultValue={row.phone} />
                              <TextField name="helpWith" label="Will be able to help with" defaultValue={row.helpWith} />
                            </div>
                          )}
                        />
                        <div className="mt-4">
                          <TextArea
                            name="disasterPlanText"
                            label="These are my plans for a natural disaster, emergency preparedness, and/or evacuation plan. This includes the care of service animals or pets."
                            defaultValue={plan.disasterPlanText}
                            rows={3}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "ccp.disasterReviewItems",
                    el: (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                          Review needed items to take (check all that apply)
                        </p>
                        <CheckboxGroup
                          name="disasterReviewItems"
                          options={fields["ccp.disasterReviewItems"]?.options ?? DISASTER_REVIEW_ITEMS_OPTIONS}
                          defaultValues={plan.disasterReviewItems}
                        />
                        <div className="mt-2 max-w-md">
                          <TextField name="disasterReviewItemsOther" label="Other, specify" defaultValue={plan.disasterReviewItemsOther} />
                        </div>

                        <div className="mt-4 space-y-3">
                          <TextField name="disasterDmeNeedsProvider" label="DME needs/provider" defaultValue={plan.disasterDmeNeedsProvider} />
                          <TextField name="disasterTransportationCo" label="Transportation needs/company" defaultValue={plan.disasterTransportationCo} />
                          <TextField name="disasterMedicationPickup" label="I can get my medication/drugs at" defaultValue={plan.disasterMedicationPickup} />
                          <TextField name="disasterHomeHealthAgency" label="Home health care agency" defaultValue={plan.disasterHomeHealthAgency} />
                          <TextField name="disasterServiceAnimalsCare" label="Care of service animals or pets" defaultValue={plan.disasterServiceAnimalsCare} />
                        </div>

                        <div className="mt-4 space-y-2">
                          <Checkbox name="hasEmergencyContactsList" label="Have a list of emergency contacts (including my care coordinator)" defaultChecked={plan.hasEmergencyContactsList ?? false} />
                          <Checkbox
                            name="discussedSafetyWithCoordinator"
                            label="Discussed with my care coordinator ways to stay safe in case of a fire, flood, or any other natural disaster."
                            defaultChecked={plan.discussedSafetyWithCoordinator ?? false}
                          />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Other Services that will be Provided to the Member">
              <p className="mb-2 text-xs text-stone-600">
                Any non-covered services including services provided by other community resources, including social support services, and assistance needed
                in order to ensure the Member&apos;s health, safety and welfare.
              </p>
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.otherServicesText",
                    el: (
                      <div>
                        <Checkbox name="otherServicesNa" label="N/A" defaultChecked={plan.otherServicesNa ?? false} />
                        <div className="mt-2">
                          <TextArea name="otherServicesText" label="Other services" defaultValue={plan.otherServicesText} rows={3} />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Services Provided by Medicare Payers, Medicare Advantage Plans and Medicare Providers">
              <p className="mb-2 text-xs text-stone-600">To coordinate services for Members who are also Dual Eligible, as reported by the Member.</p>
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.dualEligibleInfoNeeded",
                    el: (
                      <div>
                        <div className="flex gap-6">
                          <Checkbox name="dualEligibleNoNeedsIdentified" label="No needs identified" defaultChecked={plan.dualEligibleNoNeedsIdentified ?? false} />
                          <Checkbox name="dualEligibleNa" label="N/A" defaultChecked={plan.dualEligibleNa ?? false} />
                        </div>
                        <div className="mt-2">
                          <TextArea name="dualEligibleInfoNeeded" label="Information/assistance needed/provided" defaultValue={plan.dualEligibleInfoNeeded} rows={3} />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Frequency of Planned Care Coordinator Contacts">
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.otherContactSchedule",
                    el: (
                      <div>
                        <div className="space-y-2">
                          <Checkbox
                            name="ccl1ContactGuidelines"
                            label="CCL1 Contact Guidelines: 1 CNA per year, 1 bi-annual in-person visit, quarterly telephonic touchpoints. Additional touchpoints may be conducted as needed."
                            defaultChecked={plan.ccl1ContactGuidelines ?? false}
                          />
                          <Checkbox
                            name="ccl2ContactGuidelines"
                            label="CCL2 Contact Guidelines: 2 CNAs per year, 1 bi-annual in-person visit, quarterly telephonic touchpoints. Additional touchpoints may be conducted as needed."
                            defaultChecked={plan.ccl2ContactGuidelines ?? false}
                          />
                        </div>
                        <div className="mt-2 max-w-md">
                          <TextField name="otherContactSchedule" label="Other contact schedule requested by Member (list)" defaultValue={plan.otherContactSchedule} />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Member's Choice (if applicable)">
              <div className="flex flex-wrap gap-6">
                <Checkbox name="agencyBasedCb" label="Agency Based Community Benefit (CB)" defaultChecked={plan.agencyBasedCb ?? false} />
                <Checkbox name="selfDirectedCb" label="Self-Directed CB" defaultChecked={plan.selfDirectedCb ?? false} />
                <Checkbox name="nursingFacility" label="Nursing Facility" defaultChecked={plan.nursingFacility ?? false} />
              </div>
            </Card>

            <Card title="Member's Choice of Community Benefit Settings and Providers (if applicable)">
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.cbSettingsChoice",
                    el: (
                      <TextArea
                        name="cbSettingsChoice"
                        label="List facilities/settings/providers offered to member and identify and document member choice"
                        defaultValue={plan.cbSettingsChoice}
                        rows={3}
                      />
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Closing">
              <OrderedStack
                order={fieldOrder}
                items={[
                  {
                    key: "ccp.mcoIntegrationPlan",
                    el: (
                      <div className="space-y-4">
                        <div>
                          <Checkbox name="hasCommunityBenefits" label="Member has Community Benefits" defaultChecked={plan.hasCommunityBenefits ?? false} />
                          <div className="mt-2">
                            <TextArea
                              name="mcoIntegrationPlan"
                              label="Describe MCO plan to ensure member has opportunities for Community Integration"
                              defaultValue={plan.mcoIntegrationPlan}
                              rows={3}
                            />
                          </div>
                        </div>
                        <Checkbox
                          name="hasFacilityCarePlan"
                          label="Member has a Care Plan developed by the facility where they reside or receive services"
                          defaultChecked={plan.hasFacilityCarePlan ?? false}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            <CustomQuestionsSection questions={customQuestions} />
          </form>

          <Card title="Opportunities, Goals, Interventions and Desired Health, Functional and Quality of Life Outcomes for the Member">
            <div className="space-y-4">
              {plan.goals.length === 0 && <p className="text-sm text-stone-600">No goals yet. Add the first one below.</p>}
              {plan.goals.map((goal) => (
                <GoalCard key={goal.id} memberId={memberId} carePlanId={plan.id} goal={goal} fields={fields} fieldOrder={fieldOrder} />
              ))}
              <form action={addGoal.bind(null, memberId, plan.id)} className="print:hidden">
                <button type="submit" className="rounded-md border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-400 hover:text-charcoal">
                  + Add Opportunity/Goal
                </button>
              </form>
            </div>
          </Card>

          <FloatingSaveBar>
            <SaveCarePlanButton goalIds={plan.goals.map((g) => g.id)} />
          </FloatingSaveBar>
        </div>
      )}
    </div>
    </FormFieldsProvider>
  );
}

// One button, always at the very bottom, saves everything: the CCP form,
// every goal's own form, and any progress-update note that's been typed but
// not yet added (each goal keeps its own <form>s — HTML doesn't allow
// nesting them inside the CCP form's). No per-goal submit button exists any
// more; this is the only way any of it gets saved. Progress-note forms are
// only submitted when they actually have a note typed in, both to avoid
// spamming empty saves and because the server action no-ops on an empty
// note anyway — the point here is to never silently lose a typed draft to
// the page refresh the other submits trigger.
function SaveCarePlanButton({ goalIds }: { goalIds: string[] }) {
  return (
    <button
      type="button"
      onClick={() => {
        // This button lives outside every form it submits (HTML forbids
        // nesting them), so it never remounts on save the way a plain
        // in-form save button does — scroll to top here explicitly instead
        // of relying on FloatingSaveBar's mount effect.
        window.scrollTo({ top: 0, behavior: "smooth" });
        (document.getElementById("ccp-form") as HTMLFormElement | null)?.requestSubmit();
        for (const goalId of goalIds) {
          (document.getElementById(`goal-form-${goalId}`) as HTMLFormElement | null)?.requestSubmit();
          for (const track of ["member", "coordinator"]) {
            const form = document.getElementById(`${goalId}-${track}-progress-form`) as HTMLFormElement | null;
            const noteFields = form?.querySelectorAll<HTMLTextAreaElement>('textarea[name="note"]');
            const hasContent = noteFields ? Array.from(noteFields).some((el) => el.value.trim()) : false;
            if (hasContent) form?.requestSubmit();
          }
        }
      }}
      className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 print:hidden"
    >
      Save Care Plan
    </button>
  );
}
