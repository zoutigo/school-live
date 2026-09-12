import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ChildReenrollmentCard,
  type ChildFinanceStatus,
} from "./child-reenrollment-card";

const BASE_CHILD: ChildFinanceStatus = {
  student: {
    id: "student-1",
    firstName: "Remi",
    lastName: "Ntamack",
    dateOfBirth: "2015-04-12",
  },
  status: "READY_TO_REINSCRIBE",
  targetSchoolYearId: "sy-2026",
  targetSchoolYearLabel: "2026-2027",
  requiredAmount: 30000,
  previousClassLabel: "CE1-B",
  previousLevelLabel: "CE1",
  nextAcademicLevelLabel: "CE2",
  reinscriptionDeadline: "2099-07-15",
};

describe("ChildReenrollmentCard (web, shared)", () => {
  it("affiche la date de naissance et la transition de niveau", () => {
    render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={BASE_CHILD}
        walletBalance={50000}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(screen.getByText(/12 avr\. 2015/)).toBeInTheDocument();
    expect(screen.getByText(/CE1/)).toBeInTheDocument();
    expect(screen.getByText(/CE2/)).toBeInTheDocument();
  });

  it("active le CTA et n'affiche pas de message de solde insuffisant quand le wallet couvre le montant requis", () => {
    render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={BASE_CHILD}
        walletBalance={50000}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("insufficient-balance-student-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("pay-and-reinscribe-student-1"),
    ).not.toBeDisabled();
  });

  it("affiche un message de solde insuffisant et desactive le CTA quand le wallet ne couvre pas le montant requis", () => {
    const onPayAndReinscribe = vi.fn();
    render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={BASE_CHILD}
        walletBalance={1000}
        submitting={false}
        onPayAndReinscribe={onPayAndReinscribe}
      />,
    );
    expect(
      screen.getByTestId("insufficient-balance-student-1"),
    ).toBeInTheDocument();
    const button = screen.getByTestId("pay-and-reinscribe-student-1");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onPayAndReinscribe).not.toHaveBeenCalled();
  });

  it("affiche une alerte 'echeancier non configure' au lieu d'un montant a 0 quand requiredAmount est absent", () => {
    render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={{ ...BASE_CHILD, requiredAmount: null }}
        walletBalance={50000}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("fee-schedule-missing-student-1"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("pay-and-reinscribe-student-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("insufficient-balance-student-1"),
    ).not.toBeInTheDocument();
  });

  it("masque le CTA et affiche le badge de confirmation une fois l'enfant reinscrit", () => {
    render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={{
          ...BASE_CHILD,
          status: "ALREADY_REINSCRIBED",
          requiredAmount: 0,
        }}
        walletBalance={0}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("pay-and-reinscribe-student-1"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Deja reinscrit(e)").length).toBeGreaterThan(0);
  });

  it("n'affiche le lien vers les fournitures que si onViewSupplies est fourni", () => {
    const onViewSupplies = vi.fn();
    const { rerender } = render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={{ ...BASE_CHILD, status: "ALREADY_REINSCRIBED" }}
        walletBalance={0}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("view-supplies-student-1"),
    ).not.toBeInTheDocument();

    rerender(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={{ ...BASE_CHILD, status: "ALREADY_REINSCRIBED" }}
        walletBalance={0}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
        onViewSupplies={onViewSupplies}
      />,
    );
    fireEvent.click(screen.getByTestId("view-supplies-student-1"));
    expect(onViewSupplies).toHaveBeenCalledTimes(1);
  });

  it("n'affiche l'echeancier detaille que si showInstallmentBreakdown est actif", () => {
    const { rerender } = render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={BASE_CHILD}
        walletBalance={50000}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("installment-toggle-student-1"),
    ).not.toBeInTheDocument();

    rerender(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={BASE_CHILD}
        walletBalance={50000}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
        showInstallmentBreakdown
      />,
    );
    expect(
      screen.getByTestId("installment-toggle-student-1"),
    ).toBeInTheDocument();
  });

  it("ne casse pas l'affichage si aucune donnee enrichie n'est disponible (retro-compatibilite)", () => {
    render(
      <ChildReenrollmentCard
        schoolSlug="college-vogt"
        child={{
          student: { id: "student-2", firstName: "Awa", lastName: "Sow" },
          status: "DECISION_PENDING",
        }}
        walletBalance={0}
        submitting={false}
        onPayAndReinscribe={vi.fn()}
      />,
    );
    expect(screen.getByText("Awa Sow")).toBeInTheDocument();
  });
});
